## 前提准备

* 服务器：Linux（建议 Ubuntu 20.04+），已开放 SSH 访问。

* 安装 Docker（含 compose 插件）：

  * Ubuntu：`sudo apt-get update && sudo apt-get install -y ca-certificates curl && sudo install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`

  * 将部署用户加入 docker 组：`sudo usermod -aG docker <your-user>`，重新登录使其生效。

* 在服务器创建部署目录与环境文件：

  * `sudo mkdir -p /opt/bemfa && sudo chown -R <your-user>:<your-user> /opt/bemfa`

  * 在 `/opt/bemfa/.env` 写入你已有的环境变量（不要放进仓库）。

## 初始化 GitHub 仓库

* 本地创建远程仓库：在 GitHub 新建一个空仓库，例如 `bemfa-node-service`。

* 添加远程并推送：

  * `git init`

  * `git remote add origin git@github.com:<your-account>/bemfa-node-service.git`

  * `git add . && git commit -m "init: bemfa node service"`

  * `git push -u origin main`

* 确保 `.dockerignore` 包含 `.env`、`node_modules` 等敏感/冗余内容。

## 部署策略选择

* 策略 A（符合你的原始需求）：上传源码到服务器后在服务器本地构建镜像并运行。

* 策略 B（更稳健、效率更高）：在 CI 中构建镜像并推送到镜像仓库（GHCR），服务器只负责拉取镜像并运行。

## 策略 A：上传源码到服务器构建镜像

### 配置 GitHub Secrets（在仓库 Settings → Secrets and variables → Actions）

* `SSH_HOST`：服务器地址，例如 `your.server.com`

* `SSH_PORT`：SSH 端口，默认 `22`

* `SSH_USER`：服务器登录用户，例如 `ubuntu`

* `SSH_PRIVATE_KEY`：部署用的私钥内容（PEM），建议专用只读权限。

* `SERVER_DIR`：服务器上的部署目录，例如 `/opt/bemfa`

### 添加 CI 工作流（.github/workflows/deploy.yml）

* 在仓库中新建该文件，内容如下（你复制粘贴即可）：

```
name: Deploy to Server (Build on Server)

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Copy project to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          port: ${{ secrets.SSH_PORT }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "*"
          target: ${{ secrets.SERVER_DIR }}
          rm: true

      - name: Build & Run Docker on server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          port: ${{ secrets.SSH_PORT }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ${{ secrets.SERVER_DIR }}
            docker stop bemfa-node || true
            docker rm bemfa-node || true
            docker build -t bemfa-node-service:latest .
            docker run -d --name bemfa-node -p 3000:3000 --env-file .env --restart unless-stopped bemfa-node-service:latest
            docker image prune -f || true
```

* 说明：

  * 每次推送到 `main` 分支，工作流自动将仓库内容上传到服务器并在服务器上构建与运行。

  * `.env` 必须提前在服务器的 `SERVER_DIR` 下准备好。

### 首次验证

* 推送到 `main` 后，进入 GitHub Actions 查看 `Deploy to Server` 工作流是否成功。

* 在服务器上验证：

  * `curl http://localhost:3000/health` 返回 `{"ok":true}` 则正常。

## 策略 B：CI 构建镜像并推送 GHCR（推荐）

### 准备镜像仓库权限

* 在仓库 Settings → Actions → General，确保 `Workflow permissions` 中 `Read and write permissions` 开启，使内置 `GITHUB_TOKEN` 能推送 GHCR。

### 服务器准备 docker-compose.yml（示例）

* 在 `/opt/bemfa/docker-compose.yml`：

```
services:
  bemfa-node:
    image: ghcr.io/<your-account>/bemfa-node-service:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
```

### 配置 GitHub Secrets

* `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`（同策略 A）。

### 添加 CI 工作流（.github/workflows/deploy-ghcr.yml）

```
name: Build & Deploy via GHCR

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - name: SSH Pull & Restart
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          port: ${{ secrets.SSH_PORT }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/bemfa
            docker compose pull
            docker compose up -d
            docker image prune -f || true
```

* 说明：

  * 构建发生在 CI，服务器只负责 `docker compose pull` 与 `up -d`，无需上传源码与在服务器上编译。

  * 更快、更稳定，可轻松回滚到旧镜像标签。

## 回滚与版本管理建议

* 策略 A：保留上一版镜像标签（如将 `latest` 同时打 `sha` 标签），需要时重新 `docker run` 指定旧标签。

* 策略 B：GHCR 保留多版本标签；服务器 `docker compose` 指定某个标签，执行 `pull` 与 `up -d` 即可回滚。

## 安全与运维最佳实践

* 使用单独的部署用户与 SSH key；服务器端 `~/.ssh/authorized_keys` 仅允许该 key。

* 不将 `.env` 或任何密钥提交到仓库；统一保存在服务器目录。

* 容器使用 `--restart unless-stopped` 保证重启恢复；可结合 `watchtower` 自动追踪镜像更新（策略 B 更适合）。

* 记录部署日志：GitHub Actions 日志与服务器 `docker logs bemfa-node`。

## 你现在需要做的事

1. 在 GitHub 创建仓库并推送代码。
2. 选定策略：A（上传构建）或 B（CI 构建+仓库）。
3. 按所选策略：设置 Secrets，添加对应工作流文件。
4. 在服务器准备 `/opt/bemfa/.env` 与（策略 B 还需）`docker-compose.yml`。
5. 推送到 `main`，观察 Actions，验证健康检查与日志。

如你确认策略与路径，我可以进一步把对应的 CI 工作流文件与（策略 B 的）docker-compose 示例直接加到你的仓库中。
