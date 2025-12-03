# Bemfa Node Service

## 功能概述
- 使用 `Express` 提供 HTTP 服务与健康检查。
- 连接 `Bemfa` MQTT，订阅指定主题，收到消息 `on` 时触发开门接口。
- 通过环境变量配置开门接口地址、方法、请求头与请求体。
- 内置冷却时间，避免短时间内重复触发。
- 支持 Docker 打包与在云服务器运行。

## 目录结构
- `src/index.js` 服务入口与路由
- `src/config.js` 环境变量配置
- `src/logger.js` 日志
- `src/mqttClient.js` Bemfa MQTT 客户端
- `src/doorClient.js` 开门 HTTP 调用
- `.env.example` 环境变量示例
- `Dockerfile` 镜像构建文件
- `.dockerignore` Docker 忽略文件

## 环境变量
参考 `.env.example`：
- `PORT` 服务端口
- `BEMFA_URL` Bemfa MQTT 地址，默认 `mqtt://bemfa.com:9501`
- `BEMFA_CLIENT_ID` Bemfa 私钥（ClientId）
- `BEMFA_TOPIC` 订阅主题，例如 `mqtt001`
- `DOOR_API_URL` 开门接口完整 URL
- `DOOR_API_METHOD` `POST` 等 HTTP 方法
- `DOOR_API_HEADERS` JSON 字符串格式的请求头
- `DOOR_API_BODY` JSON 字符串格式的请求体
- `DOOR_COOLDOWN_MS` 冷却毫秒数，默认 `5000`
### 鉴权登录（可选）
- `AUTH_LOGIN_URL` 登录接口 URL（设置后启用自动登录）
- `AUTH_LOGIN_METHOD` 登录方法，默认 `POST`
- `AUTH_LOGIN_HEADERS` 登录请求头（JSON 字符串）
- `AUTH_LOGIN_BODY` 登录请求体（JSON 字符串）
- `AUTH_TOKEN_PATH` 从登录响应中取 Token 的路径，默认 `token`
- `AUTH_HEADER_NAME` 注入到开门请求的头名，默认 `Authorization`
- `AUTH_HEADER_PREFIX` 头值前缀，默认 `Bearer `
- `AUTH_REFRESH_INTERVAL_MS` 定时刷新间隔，默认 `3600000`

## 本地运行
1. 安装依赖
   ```
   npm install
   ```
2. 复制并填写环境变量
   ```
   cp .env.example .env
   ```
3. 启动服务
   ```
   npm start
   ```
4. 健康检查
   - `GET http://localhost:3000/health`
5. 手动开门触发
   - `POST http://localhost:3000/open-door`
6. 手动刷新登录 Token（启用鉴权时）
   - `POST http://localhost:3000/auth/refresh`

## Docker 构建与运行
1. 构建镜像
   ```
   docker build -t bemfa-node-service:latest .
   ```
2. 运行容器（挂载环境变量文件）
   ```
   docker run -d --name bemfa-node -p 3000:3000 --env-file .env bemfa-node-service:latest
   ```

## Bemfa 与小爱对接提示
- 在 Bemfa 新建设备与主题，绑定到米家并同步设备。
- 当对小爱说“打开门禁”，Bemfa 会向主题推送消息，一般是 `on`。
- 服务订阅到该主题后，将会自动调用开门接口。

## 使用 GitHub Actions + GHCR 自动部署（推荐）
- 在仓库新增工作流文件：`.github/workflows/deploy-ghcr.yml`（已提供）。
- 在仓库 Settings → Actions → General 将 `Workflow permissions` 设置为 `Read and write permissions`。
- 在仓库 Settings → Secrets and variables → Actions 添加：`SSH_HOST`、`SSH_PORT`、`SSH_USER`、`SSH_PRIVATE_KEY`。
- 在服务器 `/opt/bemfa` 目录创建 `docker-compose.yml`，可参考 `deploy/docker-compose.example.yml`，并准备 `.env`。
- 推送到 `main` 后，Actions 会构建并推送镜像到 `ghcr.io/<your-account>/<repo>:latest`，随后通过 SSH 执行 `docker compose pull` 与 `up -d` 完成更新。

## 需要你提供的信息
- `DOOR_API_URL`、`DOOR_API_METHOD`、`DOOR_API_HEADERS`、`DOOR_API_BODY` 的实际数据。
- 如果开门接口需要鉴权，请提供：登录接口的 URL/方法/头/体，以及 Token 在响应中的路径。

## 故障排查
- 未触发：确认 `BEMFA_CLIENT_ID` 与 `BEMFA_TOPIC` 正确，检查 Bemfa 控制台订阅者在线数为 1。
- 调用失败：检查开门接口响应与日志，调整 `DOOR_API_HEADERS`/`DOOR_API_BODY`。
- 频繁触发：调整 `DOOR_COOLDOWN_MS`。
