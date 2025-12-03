## 方式一：本地新增并推送

1. 在项目根目录创建工作流目录：
   - `mkdir -p .github/workflows`
2. 新建文件 `.github/workflows/deploy-ghcr.yml`，填入以下内容：
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
3. 提交并推送：
   - `git add .github/workflows/deploy-ghcr.yml`
   - `git commit -m "chore(ci): add deploy GHCR workflow"`
   - `git push origin main`

## 方式二：在 GitHub 网页端创建

1. 打开你的 GitHub 仓库 → 点击 `Add file` → 选择 `Create new file`。
2. 在文件名输入框填入：`.github/workflows/deploy-ghcr.yml`（包含路径）。
3. 将上面的 YAML 内容粘贴到编辑器。
4. 下方选择提交到 `main` 分支，点击 `Commit new file`。

## 权限与 Secrets 必备配置

- 仓库 → Settings → Actions → General：
  - `Workflow permissions` 设置为 `Read and write permissions`（允许推送 GHCR）。
- 仓库 → Settings → Secrets and variables → Actions：新增 Secrets：
  - `SSH_HOST`、`SSH_PORT`（默认 `22`）、`SSH_USER`、`SSH_PRIVATE_KEY`（PEM 格式私钥）。
- 服务器：准备 `/opt/bemfa/docker-compose.yml` 与 `.env`（不放仓库）。

## 首次验证

- 推送到 `main` 后，在仓库 `Actions` 页面查看两个 Job：`build-and-push` 与 `deploy`。
- 服务器执行：`cd /opt/bemfa && docker compose ps`；访问 `http://<server>:3000/health` 确认返回 `{"ok":true}`。

如你需要，我可以将该工作流文件与 `docker-compose.yml` 的示例内容一次性提供（你复制即可），并指导你填写服务器 Secrets。