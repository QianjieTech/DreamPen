# DreamPen - AI辅助小说创作系统

DreamPen 是一个基于 FastAPI 和 LangChain 的 AI 辅助小说创作系统，通过多个专业 Agent 协助作者完成从世界观构建到章节创作的全流程。

## 项目特点

- ✅ **安全的文件操作** - 枚举式文件服务，防止目录遍历攻击
- ✅ **AI Agent 驱动** - 基于 LangChain 的对话式创作助手
- ✅ **灵活的 API 配置** - 支持自定义 OpenAI 兼容端点
- ✅ **结构化项目管理** - 清晰的文件组织和版本控制

## 技术栈

- **后端框架**: FastAPI
- **AI 框架**: LangChain + LangGraph
- **配置管理**: Pydantic Settings
- **依赖管理**: uv (Python 包管理器)
- **语言模型**: OpenAI API (或兼容端点)

## 项目结构

```
dreampen/
├── backend/                    # 后端代码
│   ├── api/                   # API 路由
│   │   ├── worldview.py      # 世界观 Agent API
│   │   └── projects.py       # 项目管理 API
│   ├── core/                  # 核心模块
│   │   └── config.py         # 配置管理
│   ├── models/                # 数据模型
│   │   └── schemas.py        # Pydantic 模型
│   ├── services/              # 业务逻辑
│   │   ├── agent_service.py  # AI Agent 服务
│   │   └── file_service.py   # 文件服务
│   └── main.py               # FastAPI 应用入口
├── prompts/                   # Agent 提示词
│   └── worldview_agent_prompt.md  # 世界观 Agent 提示词
├── docs/                      # 文档
│   ├── DESIGN.md             # 整体设计文档
│   └── AGENT_WORKFLOW_DESIGN.md   # Agent 工作流设计
├── test_basic.py             # 基础功能测试脚本
├── pyproject.toml            # 项目依赖配置
├── .env.example              # 环境变量模板
└── README.md                 # 本文件
```

## 快速开始

### 1. 环境准备

```bash
# 安装 uv (如果还未安装)
pip install uv

# 安装项目依赖
uv sync
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置你的 API Key
# OPENAI_API_KEY=your-api-key-here
# OPENAI_BASE_URL=https://api.openai.com/v1
```

### 3. 运行测试

```bash
# 运行基础功能测试
python test_basic.py
```

### 4. 启动服务器

```bash
# 开发模式
fastapi dev backend/main.py

# 生产模式
fastapi run backend/main.py
```

### 5. 访问 API 文档

启动服务器后，访问 http://localhost:8000/docs 查看交互式 API 文档。

## API 端点

### 健康检查
- `GET /health` - 健康检查

### 世界观 Agent
- `POST /api/worldview/chat` - 与世界观 Agent 对话
- `GET /api/worldview/read` - 读取世界观文件
- `POST /api/worldview/write` - 写入世界观文件

### 项目管理
- `POST /api/projects/` - 创建新项目
- `GET /api/projects/{project_id}/chapters` - 列出章节
- `GET /api/projects/{project_id}/exists` - 检查项目是否存在

## 配置说明

### OpenAI API 配置

系统支持自定义 OpenAI 兼容端点，可以使用：

- **OpenAI 官方 API**
  ```
  OPENAI_BASE_URL=https://api.openai.com/v1
  ```

- **Azure OpenAI**
  ```
  OPENAI_BASE_URL=https://your-resource.openai.azure.com/
  ```

- **本地模型或其他兼容服务**
  ```
  OPENAI_BASE_URL=http://localhost:8000/v1
  ```

### 文件存储路径

默认情况下，用户项目文件存储在 `./git_repos/{user_id}/{project_id}/` 目录下。

可以通过环境变量 `GIT_REPOS_BASE_PATH` 自定义存储路径。

## 开发指南

### 添加新的 Agent

1. 在 `prompts/` 目录创建提示词文件
2. 在 `backend/services/agent_service.py` 创建 Agent 类
3. 在 `backend/api/` 创建对应的 API 路由
4. 在 `backend/main.py` 注册路由

### 文件操作安全

所有文件操作都通过 `FileService` 进行，该服务提供：
- 路径验证（防止目录遍历）
- 枚举式接口（只允许预定义操作）
- 参数验证（严格的输入检查）

### 测试

运行测试脚本验证基础功能：

```bash
python test_basic.py
```

## 架构设计

### Agent 工作流

系统采用 LangGraph 构建 Agent 工作流，支持：
- 多轮对话
- 状态管理
- 文件操作
- 任务路由

### 文件组织

用户项目按以下结构组织：

```
{project_id}/
├── 01_settings/         # 基础设定层
│   ├── worldview.md    # 世界观设定
│   └── style_guide.md  # 文风指导
├── 02_characters/       # 角色管理层
├── 03_outlines/         # 规划层（大纲）
├── 04_scene_plans/      # 细纲层
├── 05_chapters/         # 正文层
└── 06_states/          # 状态追踪层
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

[待添加]

## 联系方式

[待添加]