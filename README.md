# mappd

把散乱攻略变成一张可以走的地图 — J 人自由行时序决策沙盘。

## 功能

- 输入出发城市、目的地、天数、人数和交通偏好
- 调用 DeepSeek AI 生成结构化旅行路线方案
- 左侧展示规划书（节点、预算、决策逻辑）
- 右侧 Leaflet 地图展示动线与多维视图切换

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制环境变量模板并填入你的 DeepSeek API Key：

```bash
cp .env.example .env.local
```

在 [DeepSeek 开放平台](https://platform.deepseek.com) 注册并获取 API Key，写入 `.env.local`：

```
DEEPSEEK_API_KEY=sk-xxxxxxxx
```

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)

> 如需使用 Vercel 官方开发环境（需先执行 `npx vercel login`），可运行 `npm run dev:vercel`。

## 项目结构

```
mappd/
├── api/
│   ├── plan_options.js   # 大路线规划 API（前端主接口）
│   └── generate.js       # 景点攻略生成 API
├── public/
│   └── index.html        # 前端页面
├── dev-server.js         # 本地开发服务器
├── vercel.json           # Vercel 路由配置
└── package.json
```

## 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 在 Vercel 项目 Settings → Environment Variables 中添加 `DEEPSEEK_API_KEY`
4. 部署即可
