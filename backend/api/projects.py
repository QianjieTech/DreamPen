"""
项目管理API路由
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
import uuid
from backend.models.schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectListItem,
    SuccessResponse
)
from backend.models.database import User, Project
from backend.core.dependencies import get_current_user
from backend.core.database import get_db
from backend.services.file_service import FileServiceFactory
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/", response_model=List[ProjectListItem])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前用户的所有项目
    
    Args:
        current_user: 当前登录用户
        db: 数据库会话
        
    Returns:
        项目列表
    """
    try:
        result = await db.execute(
            select(Project)
            .where(Project.user_id == current_user.id)
            .order_by(Project.updated_at.desc())
        )
        projects = result.scalars().all()
        
        return [ProjectListItem.from_orm(proj) for proj in projects]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目列表失败: {str(e)}")


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建新项目
    
    Args:
        project: 项目信息
        current_user: 当前登录用户
        db: 数据库会话
        
    Returns:
        项目响应
    """
    try:
        # 生成唯一的项目ID
        project_id = f"{project.name.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}"
        
        # 检查项目ID是否已存在
        result = await db.execute(
            select(Project).where(Project.project_id == project_id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="项目ID已存在，请重试")
        
        # 在数据库中创建项目记录
        db_project = Project(
            user_id=current_user.id,
            project_id=project_id,
            name=project.name,
            description=project.description
        )
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        
        # 初始化项目文件系统
        file_service = FileServiceFactory.create(current_user.username, project_id)
        await file_service.init_project()
        
        return ProjectResponse(
            project_id=project_id,
            name=project.name,
            description=project.description,
            created_at=db_project.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"创建项目失败: {str(e)}")


@router.get("/{project_id}", response_model=ProjectListItem)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取项目详情
    
    Args:
        project_id: 项目ID
        current_user: 当前登录用户
        db: 数据库会话
        
    Returns:
        项目详情
    """
    try:
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.project_id == project_id,
                    Project.user_id == current_user.id
                )
            )
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")
        
        return ProjectListItem.from_orm(project)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目失败: {str(e)}")


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    删除项目（仅删除数据库记录，不删除文件）
    
    Args:
        project_id: 项目ID
        current_user: 当前登录用户
        db: 数据库会话
        
    Returns:
        成功消息
    """
    try:
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.project_id == project_id,
                    Project.user_id == current_user.id
                )
            )
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")
        
        await db.delete(project)
        await db.commit()
        
        return {"message": "项目已删除"}
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"删除项目失败: {str(e)}")


@router.get("/{project_id}/chapters", response_model=list[dict])
async def list_chapters(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    列出项目的所有章节
    
    Args:
        project_id: 项目ID
        current_user: 当前登录用户
        
    Returns:
        章节列表
    """
    try:
        file_service = FileServiceFactory.create(current_user.username, project_id)
        chapters = await file_service.list_chapters()
        
        return chapters
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/exists", response_model=dict)
async def check_project_exists(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    检查项目是否存在
    
    Args:
        project_id: 项目ID
        current_user: 当前登录用户
        
    Returns:
        存在状态
    """
    try:
        file_service = FileServiceFactory.create(current_user.username, project_id)
        exists = file_service.project_exists()
        
        return {"exists": exists}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files", response_model=list[dict])
async def get_file_tree(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    获取项目文件树（动态扫描）
    
    Args:
        project_id: 项目ID
        current_user: 当前登录用户
        
    Returns:
        文件树结构
    """
    try:
        file_service = FileServiceFactory.create(current_user.username, project_id)
        
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
    current_user: User = Depends(get_current_user)
):
    """
    读取任意文件内容（动态）
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        current_user: 当前登录用户
        
    Returns:
        文件内容
    """
    try:
        file_service = FileServiceFactory.create(current_user.username, project_id)
        
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
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """
    创建新文件
    
    Args:
        project_id: 项目ID
        request: 包含 file_path 和 content 的请求体
        current_user: 当前登录用户
        
    Returns:
        成功响应
    """
    try:
        file_path = request.get("file_path", "")
        content = request.get("content", "")
        
        if not file_path:
            raise HTTPException(status_code=400, detail="文件路径不能为空")
        
        file_service = FileServiceFactory.create(current_user.username, project_id)
        
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
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """
    写入任意文件内容（动态）
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        request: 包含 content 的请求体
        current_user: 当前登录用户
        
    Returns:
        成功响应
    """
    try:
        content = request.get("content", "")
        
        file_service = FileServiceFactory.create(current_user.username, project_id)
        
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
    current_user: User = Depends(get_current_user)
):
    """
    删除文件
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        current_user: 当前登录用户
        
    Returns:
        成功响应
    """
    try:
        file_service = FileServiceFactory.create(current_user.username, project_id)
        
        # 删除文件
        await file_service.delete_file(file_path)
        
        return {"message": "文件删除成功", "file_path": file_path}
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="文件不存在")
    except Exception as e:
        print(f"删除文件错误: {e}")  # 添加调试日志
        raise HTTPException(status_code=500, detail=str(e))