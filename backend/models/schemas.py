"""
Pydantic数据模型
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


# ========== 项目相关 ==========

class ProjectCreate(BaseModel):
    """创建项目请求"""
    name: str = Field(..., description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")


class ProjectResponse(BaseModel):
    """项目响应"""
    project_id: str = Field(..., description="项目ID")
    name: str = Field(..., description="项目名称")
    description: Optional[str] = None
    created_at: str = Field(..., description="创建时间")


class ProjectListItem(BaseModel):
    """项目列表项"""
    id: int = Field(..., description="数据库ID")
    project_id: str = Field(..., description="项目ID")
    name: str = Field(..., description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True


# ========== Agent对话相关 ==========

class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="角色: user, assistant, system")
    content: str = Field(..., description="消息内容")


class WorldviewChatRequest(BaseModel):
    """世界观Agent对话请求"""
    message: str = Field(..., description="用户消息")
    conversation_history: list[ChatMessage] = Field(
        default_factory=list,
        description="对话历史"
    )
    custom_prompt: Optional[str] = Field(None, description="自定义提示词")


class WorldviewChatResponse(BaseModel):
    """世界观Agent对话响应"""
    reply: str = Field(..., description="AI回复")
    file_operations: list[dict] = Field(
        default_factory=list,
        description="执行的文件操作"
    )


# ========== 文件相关 ==========

class FileReadRequest(BaseModel):
    """文件读取请求"""
    file_type: str = Field(..., description="文件类型: worldview, character, outline等")
    file_name: Optional[str] = Field(None, description="文件名(如角色名、章节号)")


class FileWriteRequest(BaseModel):
    """文件写入请求"""
    file_type: str = Field(..., description="文件类型")
    content: str = Field(..., description="文件内容")
    file_name: Optional[str] = None


class FileResponse(BaseModel):
    """文件响应"""
    content: str = Field(..., description="文件内容")
    path: str = Field(..., description="文件路径")


# ========== 通用响应 ==========

class SuccessResponse(BaseModel):
    """成功响应"""
    message: str = Field(..., description="成功消息")
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str = Field(..., description="错误消息")
    detail: Optional[str] = None


# ========== 用户认证相关 ==========

class UserRegister(BaseModel):
    """用户注册请求"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=6, max_length=100, description="密码")


class UserLogin(BaseModel):
    """用户登录请求"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class Token(BaseModel):
    """令牌响应"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class TokenData(BaseModel):
    """令牌数据"""
    username: Optional[str] = None


class UserResponse(BaseModel):
    """用户响应"""
    id: int = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    email: str = Field(..., description="邮箱")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    
    class Config:
        from_attributes = True


# ========== 对话相关 ==========

class Message(BaseModel):
    """消息模型"""
    id: str = Field(..., description="消息ID")
    role: str = Field(..., description="角色: user, assistant, system")
    content: str = Field(..., description="消息内容")
    timestamp: int = Field(..., description="时间戳")


class ConversationCreate(BaseModel):
    """创建对话请求"""
    project_id: str = Field(..., description="项目ID")
    title: Optional[str] = Field(None, description="对话标题")
    messages: list[Message] = Field(default_factory=list, description="初始消息列表")


class ConversationUpdate(BaseModel):
    """更新对话请求"""
    title: Optional[str] = Field(None, description="对话标题")
    messages: Optional[list[Message]] = Field(None, description="消息列表")
    is_collapsed: Optional[bool] = Field(None, description="是否折叠")


class ConversationResponse(BaseModel):
    """对话响应"""
    id: int = Field(..., description="对话ID")
    user_id: int = Field(..., description="用户ID")
    project_id: str = Field(..., description="项目ID")
    title: Optional[str] = Field(None, description="对话标题")
    messages: list[Message] = Field(..., description="消息列表")
    is_collapsed: bool = Field(..., description="是否折叠")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    """添加消息请求"""
    message: Message = Field(..., description="消息对象")


class MessageResponse(BaseModel):
    """消息响应"""
    conversation_id: int = Field(..., description="对话ID")
    message: Message = Field(..., description="消息对象")