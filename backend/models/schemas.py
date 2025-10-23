"""
Pydantic数据模型
"""
from pydantic import BaseModel, Field
from typing import Optional


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