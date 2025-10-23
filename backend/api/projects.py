"""
项目管理API路由
"""
from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    ProjectCreate,
    ProjectResponse,
    SuccessResponse
)
from backend.services.file_service import FileServiceFactory
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    user_id: str = "demo_user"  # TODO: 从认证中获取
):
    """
    创建新项目
    
    Args:
        project: 项目信息
        user_id: 用户ID
        
    Returns:
        项目响应
    """
    try:
        # 生成项目ID(简化版本,实际应使用UUID)
        project_id = project.name.lower().replace(" ", "_")
        
        # 初始化项目目录
        file_service = FileServiceFactory.create(user_id, project_id)
        await file_service.init_project()
        
        return ProjectResponse(
            project_id=project_id,
            name=project.name,
            description=project.description,
            created_at=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/chapters", response_model=list[dict])
async def list_chapters(
    project_id: str,
    user_id: str = "demo_user"
):
    """
    列出项目的所有章节
    
    Args:
        project_id: 项目ID
        user_id: 用户ID
        
    Returns:
        章节列表
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        chapters = await file_service.list_chapters()
        
        return chapters
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/exists", response_model=dict)
async def check_project_exists(
    project_id: str,
    user_id: str = "demo_user"
):
    """
    检查项目是否存在
    
    Args:
        project_id: 项目ID
        user_id: 用户ID
        
    Returns:
        存在状态
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        exists = file_service.project_exists()
        
        return {"exists": exists}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files", response_model=list[dict])
async def get_file_tree(
    project_id: str,
    user_id: str = "demo_user"
):
    """
    获取项目文件树（动态扫描）
    
    Args:
        project_id: 项目ID
        user_id: 用户ID
        
    Returns:
        文件树结构
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        
        # 如果项目不存在，先初始化
        if not file_service.project_exists():
            await file_service.init_project()
        
        # 动态扫描文件树
        file_tree = await file_service.scan_directory_tree()
        
        return file_tree
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files/{file_path:path}", response_model=dict)
async def read_file(
    project_id: str,
    file_path: str,
    user_id: str = "demo_user"
):
    """
    读取任意文件内容（动态）
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        user_id: 用户ID
        
    Returns:
        文件内容
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        
        # 使用通用的文件读取方法
        content = await file_service.read_any_file(file_path)
        
        return {"content": content}
    
    except FileNotFoundError:
        # 如果文件不存在，返回空内容
        return {"content": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/files/create", response_model=dict)
async def create_file(
    project_id: str,
    request: dict
):
    """
    创建新文件
    
    Args:
        project_id: 项目ID
        request: 包含 file_path、content 和 user_id 的请求体
        
    Returns:
        成功响应
    """
    try:
        file_path = request.get("file_path", "")
        content = request.get("content", "")
        user_id = request.get("user_id", "demo_user")
        
        if not file_path:
            raise HTTPException(status_code=400, detail="文件路径不能为空")
        
        file_service = FileServiceFactory.create(user_id, project_id)
        
        # 创建文件
        await file_service.write_any_file(file_path, content)
        
        return {"message": "文件创建成功", "file_path": file_path}
    
    except Exception as e:
        print(f"创建文件错误: {e}")  # 添加调试日志
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/files/{file_path:path}", response_model=dict)
async def write_file(
    project_id: str,
    file_path: str,
    request: dict
):
    """
    写入任意文件内容（动态）
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        request: 包含 content 和 user_id 的请求体
        
    Returns:
        成功响应
    """
    try:
        content = request.get("content", "")
        user_id = request.get("user_id", "demo_user")
        
        file_service = FileServiceFactory.create(user_id, project_id)
        
        # 使用通用的文件写入方法
        await file_service.write_any_file(file_path, content)
        
        return {"message": "文件保存成功"}
    
    except Exception as e:
        print(f"保存文件错误: {e}")  # 添加调试日志
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}/files/{file_path:path}", response_model=dict)
async def delete_file(
    project_id: str,
    file_path: str,
    user_id: str = "demo_user"
):
    """
    删除文件
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        user_id: 用户ID
        
    Returns:
        成功响应
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        
        # 删除文件
        await file_service.delete_file(file_path)
        
        return {"message": "文件删除成功", "file_path": file_path}
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="文件不存在")
    except Exception as e:
        print(f"删除文件错误: {e}")  # 添加调试日志
        raise HTTPException(status_code=500, detail=str(e))