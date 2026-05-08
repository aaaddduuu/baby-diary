# Baby Diary 宝宝日记

> 用爱记录成长，用科技守护未来

一款现代化的宝宝成长记录应用，帮助父母轻松记录宝宝的日常生活、成长数据和健康信息。

## 功能特性

### 核心功能
- **生活记录** - 母乳、配方奶、睡眠、尿布等日常记录
- **成长追踪** - 体重、身高、头围数据与 WHO 标准对比
- **疫苗管理** - 国家计划疫苗 + 自定义疫苗接种记录
- **费用管理** - 宝宝相关支出分类记录与统计

### 家庭协作
- **多成员支持** - 家庭成员共同参与记录
- **角色管理** - 妈妈、爸爸、爷爷奶奶等角色识别
- **数据共享** - 实时同步宝宝成长数据

### 用户体验
- **简洁界面** - 清爽直观的操作界面
- **快速记录** - 一键记录常用数据
- **数据可视化** - 图表展示成长趋势

## 技术架构

### 前端
- **React 18** - 现代化 UI 框架
- **TypeScript** - 类型安全的开发体验
- **Tailwind CSS** - 原子化 CSS 样式方案
- **Vite** - 极速构建工具

### 后端
- **Hono** - 轻量级 Web 框架
- **Cloudflare D1** - 边缘计算数据库
- **Cloudflare Workers** - 无服务器部署
- **JWT 认证** - 安全的用户认证方案

### 数据库设计
- 用户表 (users)
- 宝宝表 (babies)
- 记录表 (records)
- 支出表 (expenses)
- 成长记录表 (growth_records)
- 疫苗表 (vaccines)
- 家庭表 (families)
- 家庭成员表 (family_members)

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- Cloudflare 账号

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/aaaddduuu/baby-diary.git
cd baby-diary
```

2. 安装依赖
```bash
pnpm install
```

3. 配置环境变量
```bash
# 后端配置
cp backend/.env.example backend/.env
# 前端配置
cp frontend/.env.example frontend/.env
```

4. 数据库迁移
```bash
cd backend
pnpm run db:migrate
```

5. 启动开发服务器
```bash
pnpm run dev
```

### 部署

#### 后端部署
```bash
cd backend
pnpm run deploy
```

#### 前端部署
```bash
cd frontend
pnpm run build
pnpm run deploy
```

## 项目结构

```
baby-diary/
├── backend/                # 后端服务
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   └── index.ts       # 入口文件
│   ├── schema.sql         # 数据库结构
│   └── wrangler.toml      # Cloudflare 配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── lib/           # 工具库
│   │   └── App.tsx        # 主应用
│   └── index.html         # 入口文件
└── package.json            # 项目配置
```

## API 文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取用户信息

### 宝宝接口
- `GET /api/babies` - 获取宝宝列表
- `POST /api/babies` - 创建宝宝
- `GET /api/babies/:id` - 获取宝宝详情
- `PUT /api/babies/:id` - 更新宝宝信息

### 记录接口
- `GET /api/records` - 获取记录列表
- `POST /api/records` - 创建记录
- `PUT /api/records/:id` - 更新记录
- `DELETE /api/records/:id` - 删除记录

### 支出接口
- `GET /api/expenses` - 获取支出列表
- `POST /api/expenses` - 创建支出
- `PUT /api/expenses/:id` - 更新支出
- `DELETE /api/expenses/:id` - 删除支出

## 开发指南

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 使用 Prettier 格式化代码

### 提交规范
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- 项目地址：https://github.com/aaaddduuu/baby-diary
- 问题反馈：https://github.com/aaaddduuu/baby-diary/issues

---

**用爱记录，用心守护** ❤️
