"""
枚举式文件服务 - 预定义安全的文件操作
"""
from pathlib import Path
from typing import Optional
import aiofiles
from backend.core.config import settings


class FileService:
    """枚举式文件服务 - 只允许预定义的文件操作"""
    
    def __init__(self, user_id: str, project_id: str):
        """
        初始化文件服务
        
        Args:
            user_id: 用户ID
            project_id: 项目ID
        """
        self.user_id = user_id
        self.project_id = project_id
        self.project_path = self._get_project_path()
    
    def _get_project_path(self) -> Path:
        """获取项目路径"""
        return settings.git_repos_base_path / self.user_id / self.project_id
    
    def _validate_path(self, relative_path: str) -> Path:
        """
        验证路径安全性
        
        Args:
            relative_path: 相对路径
            
        Returns:
            完整的文件路径
            
        Raises:
            ValueError: 如果路径不安全
        """
        full_path = (self.project_path / relative_path).resolve()
        
        # 确保路径在项目目录内
        if not str(full_path).startswith(str(self.project_path.resolve())):
            raise ValueError(f"非法路径访问: {relative_path}")
        
        return full_path
    
    async def _read(self, relative_path: str) -> str:
        """
        内部读取方法
        
        Args:
            relative_path: 相对路径
            
        Returns:
            文件内容
        """
        file_path = self._validate_path(relative_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {relative_path}")
        
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            return await f.read()
    
    async def _write(self, relative_path: str, content: str) -> None:
        """
        内部写入方法
        
        Args:
            relative_path: 相对路径
            content: 文件内容
        """
        file_path = self._validate_path(relative_path)
        
        # 确保目录存在
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
            await f.write(content)
    
    # ========== 世界观设定 ==========
    
    async def read_worldview(self) -> str:
        """读取世界观设定"""
        return await self._read("01_settings/worldview.md")
    
    async def write_worldview(self, content: str) -> None:
        """写入世界观设定"""
        await self._write("01_settings/worldview.md", content)
    
    # ========== 角色卡 ==========
    
    async def read_character(self, character_name: str) -> str:
        """
        读取角色卡
        
        Args:
            character_name: 角色名称(只允许字母、数字、下划线)
        """
        # 验证角色名称
        if not character_name.replace('_', '').isalnum():
            raise ValueError("角色名称只能包含字母、数字和下划线")
        
        return await self._read(f"02_characters/main_characters/{character_name}.md")
    
    async def write_character(self, character_name: str, content: str) -> None:
        """
        写入角色卡
        
        Args:
            character_name: 角色名称
            content: 角色卡内容
        """
        if not character_name.replace('_', '').isalnum():
            raise ValueError("角色名称只能包含字母、数字和下划线")
        
        await self._write(f"02_characters/main_characters/{character_name}.md", content)
    
    # ========== 大纲 ==========
    
    async def read_outline(self) -> str:
        """读取主大纲"""
        return await self._read("03_outline/main_outline.md")
    
    async def write_outline(self, content: str) -> None:
        """写入主大纲"""
        await self._write("03_outline/main_outline.md", content)
    
    async def read_detailed_outline(self, chapter_num: int) -> str:
        """
        读取章节细纲
        
        Args:
            chapter_num: 章节号(1-500)
        """
        if not (1 <= chapter_num <= 500):
            raise ValueError("章节号必须在1-500之间")
        
        return await self._read(f"03_outline/detailed/ch{chapter_num:03d}.md")
    
    async def write_detailed_outline(self, chapter_num: int, content: str) -> None:
        """
        写入章节细纲
        
        Args:
            chapter_num: 章节号
            content: 细纲内容
        """
        if not (1 <= chapter_num <= 500):
            raise ValueError("章节号必须在1-500之间")
        
        await self._write(f"03_outline/detailed/ch{chapter_num:03d}.md", content)
    
    # ========== 文风指南 ==========
    
    async def read_style_guide(self) -> str:
        """读取文风指南"""
        return await self._read("04_style_guide/writing_style.md")
    
    async def write_style_guide(self, content: str) -> None:
        """写入文风指南"""
        await self._write("04_style_guide/writing_style.md", content)
    
    # ========== 章节 ==========
    
    async def read_chapter(self, chapter_num: int) -> str:
        """
        读取章节
        
        Args:
            chapter_num: 章节号(1-500)
        """
        if not (1 <= chapter_num <= 500):
            raise ValueError("章节号必须在1-500之间")
        
        return await self._read(f"05_chapters/ch{chapter_num:03d}.md")
    
    async def write_chapter(self, chapter_num: int, content: str) -> None:
        """
        写入章节
        
        Args:
            chapter_num: 章节号
            content: 章节内容
        """
        if not (1 <= chapter_num <= 500):
            raise ValueError("章节号必须在1-500之间")
        
        await self._write(f"05_chapters/ch{chapter_num:03d}.md", content)
    
    # ========== 项目管理 ==========
    
    async def init_project(self) -> None:
        """初始化项目目录结构"""
        directories = [
            "01_settings",
            "02_characters/main_characters",
            "02_characters/supporting_characters",
            "03_outline/detailed",
            "04_style_guide",
            "05_chapters",
        ]
        
        for directory in directories:
            dir_path = self._validate_path(directory)
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # 创建README
        readme_content = """# DreamPen 项目

这是一个由 DreamPen AI 辅助创作的写作项目。

## 目录结构

- `01_settings/` - 世界观设定
- `02_characters/` - 角色卡
- `03_outline/` - 大纲(主大纲和章节细纲)
- `04_style_guide/` - 文风指南
- `05_chapters/` - 正文章节
"""
        await self._write("README.md", readme_content)
    
    def project_exists(self) -> bool:
        """检查项目是否存在"""
        return self.project_path.exists()
    
    async def list_chapters(self) -> list[dict]:
        """
        列出所有章节
        
        Returns:
            章节列表,每项包含 chapter_num 和 title
        """
        chapters = []
        chapters_dir = self._validate_path("05_chapters")
        
        if not chapters_dir.exists():
            return chapters
        
        for file_path in sorted(chapters_dir.glob("ch*.md")):
            try:
                # 从文件名提取章节号
                chapter_num = int(file_path.stem[2:])
                
                # 读取文件第一行作为标题
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                    first_line = await f.readline()
                    title = first_line.strip().lstrip('#').strip() if first_line else f"第{chapter_num}章"
                
                chapters.append({
                    "chapter_num": chapter_num,
                    "title": title,
                    "path": str(file_path.relative_to(self.project_path))
                })
            except (ValueError, IndexError):
                continue
        
        return chapters
    
    async def scan_directory_tree(self) -> list[dict]:
        """
        扫描项目目录，返回完整的文件树结构
        
        Returns:
            文件树列表
        """
        def build_tree_node(path: Path, node_id: str) -> dict:
            """递归构建文件树节点"""
            relative_path = path.relative_to(self.project_path)
            
            node = {
                "id": node_id,
                "name": path.name,
                "type": "directory" if path.is_dir() else "file",
                "path": str(relative_path),
            }
            
            if path.is_dir():
                children = []
                try:
                    # 排序：目录在前，文件在后，同类按名称排序
                    items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
                    for idx, child_path in enumerate(items):
                        child_id = f"{node_id}-{idx + 1}"
                        children.append(build_tree_node(child_path, child_id))
                    node["children"] = children
                except PermissionError:
                    node["children"] = []
            
            return node
        
        if not self.project_path.exists():
            return []
        
        # 扫描项目根目录下的所有内容
        tree = []
        try:
            items = sorted(self.project_path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
            for idx, item in enumerate(items):
                # 跳过隐藏文件和 .git 目录
                if item.name.startswith('.'):
                    continue
                tree.append(build_tree_node(item, str(idx + 1)))
        except PermissionError:
            pass
        
        return tree
    
    async def read_any_file(self, relative_path: str) -> str:
        """
        读取任意文件（在安全路径内）
        
        Args:
            relative_path: 相对于项目根目录的路径
            
        Returns:
            文件内容
        """
        return await self._read(relative_path)
    
    async def write_any_file(self, relative_path: str, content: str) -> None:
        """
        写入任意文件（在安全路径内）
        
        Args:
            relative_path: 相对于项目根目录的路径
            content: 文件内容
        """
        await self._write(relative_path, content)
    
    async def delete_file(self, relative_path: str) -> None:
        """
        删除文件（在安全路径内）
        
        Args:
            relative_path: 相对于项目根目录的路径
            
        Raises:
            FileNotFoundError: 如果文件不存在
            ValueError: 如果路径不安全
        """
        file_path = self._validate_path(relative_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {relative_path}")
        
        if file_path.is_dir():
            raise ValueError(f"不能删除目录: {relative_path}")
        
        # 删除文件
        file_path.unlink()


class FileServiceFactory:
    """文件服务工厂"""
    
    @staticmethod
    def create(user_id: str, project_id: str) -> FileService:
        """
        创建文件服务实例
        
        Args:
            user_id: 用户ID
            project_id: 项目ID
            
        Returns:
            文件服务实例
        """
        return FileService(user_id, project_id)