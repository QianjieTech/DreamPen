"""
文件操作工具 - 供AI Agent调用
"""
import asyncio
from functools import wraps
from typing import Callable
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from backend.services.file_service import FileServiceFactory


# ========== Pydantic 模型定义 ==========

class ReadFileInput(BaseModel):
    """读取文件输入"""
    file_path: str = Field(description="文件相对路径，例如: '01_settings/worldview.md'")


class WriteFileInput(BaseModel):
    """写入文件输入"""
    file_path: str = Field(description="文件相对路径，例如: '01_settings/worldview.md'")
    content: str = Field(description="要写入的文件内容")


class ListFilesInput(BaseModel):
    """列出文件输入"""
    directory: str = Field(default="", description="子目录路径(可选)，例如: '01_settings'")


class CreateDirectoryInput(BaseModel):
    """创建目录输入"""
    directory_path: str = Field(description="目录相对路径，例如: '01_settings'")


# ========== 工具函数类 ==========

class FileTools:
    """文件操作工具类 - 绑定用户和项目上下文"""
    
    def __init__(self, user_id: str, project_id: str):
        """
        初始化文件工具
        
        Args:
            user_id: 用户ID
            project_id: 项目ID
        """
        self.user_id = user_id
        self.project_id = project_id
        self.file_service = FileServiceFactory.create(user_id, project_id)
    
    async def read_file(self, file_path: str) -> str:
        """
        读取项目文件内容
        
        Args:
            file_path: 文件相对路径
            
        Returns:
            操作结果消息（包含文件内容）
        """
        try:
            content = await self.file_service.read_any_file(file_path)
            return f"✅ 文件读取成功\n路径: {file_path}\n内容:\n```\n{content}\n```"
        except FileNotFoundError:
            return f"❌ 文件不存在: {file_path}"
        except Exception as e:
            return f"❌ 读取文件失败: {str(e)}"
    
    async def write_to_file(self, file_path: str, content: str) -> str:
        """
        写入内容到项目文件（创建或覆盖）
        
        Args:
            file_path: 文件相对路径
            content: 要写入的内容
            
        Returns:
            操作结果消息
        """
        try:
            await self.file_service.write_any_file(file_path, content)
            return f"✅ 文件写入成功\n路径: {file_path}\n大小: {len(content)} 字符"
        except Exception as e:
            return f"❌ 写入文件失败: {str(e)}"
    
    async def list_files(self, directory: str = "") -> str:
        """
        列出项目目录下的文件
        
        Args:
            directory: 子目录路径(可选)
            
        Returns:
            文件列表
        """
        try:
            from pathlib import Path
            
            if directory:
                target_path = self.file_service.project_path / directory
            else:
                target_path = self.file_service.project_path
            
            if not target_path.exists():
                return f"❌ 目录不存在: {directory or '根目录'}"
            
            files = []
            for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name)):
                if item.name.startswith('.'):
                    continue
                if item.is_file():
                    files.append(f"📄 {item.name}")
                elif item.is_dir():
                    files.append(f"📁 {item.name}/")
            
            if files:
                return f"✅ 目录: {directory or '根目录'}\n" + "\n".join(files)
            else:
                return f"✅ 目录为空: {directory or '根目录'}"
        except Exception as e:
            return f"❌ 列出文件失败: {str(e)}"
    
    async def create_directory(self, directory_path: str) -> str:
        """
        创建项目目录
        
        Args:
            directory_path: 目录相对路径
            
        Returns:
            操作结果消息
        """
        try:
            target_path = self.file_service.project_path / directory_path
            target_path.mkdir(parents=True, exist_ok=True)
            return f"✅ 目录创建成功: {directory_path}"
        except Exception as e:
            return f"❌ 创建目录失败: {str(e)}"


# ========== 创建LangChain工具 ==========

def create_file_tools(user_id: str, project_id: str) -> list[StructuredTool]:
    """
    创建绑定用户和项目的文件操作工具列表
    
    Args:
        user_id: 用户ID
        project_id: 项目ID
        
    Returns:
        LangChain StructuredTool 列表
    """
    file_tools = FileTools(user_id, project_id)
    
    # 创建异步工具（LangChain会自动处理异步）
    async def async_read_file(file_path: str) -> str:
        return await file_tools.read_file(file_path)
    
    async def async_write_to_file(file_path: str, content: str) -> str:
        return await file_tools.write_to_file(file_path, content)
    
    async def async_list_files(directory: str = "") -> str:
        return await file_tools.list_files(directory)
    
    async def async_create_directory(directory_path: str) -> str:
        return await file_tools.create_directory(directory_path)
    
    tools = [
        StructuredTool(
            name="read_file",
            description="读取项目文件内容。用于查看已存在的文件。",
            coroutine=async_read_file,
            args_schema=ReadFileInput
        ),
        StructuredTool(
            name="write_to_file",
            description="写入内容到项目文件（创建新文件或覆盖已存在的文件）。用于创建或更新文档。",
            coroutine=async_write_to_file,
            args_schema=WriteFileInput
        ),
        StructuredTool(
            name="list_files",
            description="列出项目目录下的文件和子目录。用于浏览项目结构。",
            coroutine=async_list_files,
            args_schema=ListFilesInput
        ),
        StructuredTool(
            name="create_directory",
            description="创建项目目录。用于组织文件结构。",
            coroutine=async_create_directory,
            args_schema=CreateDirectoryInput
        ),
    ]
    
    return tools