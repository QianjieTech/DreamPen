"""
Git版本控制服务
"""
from pathlib import Path
from typing import List, Optional, Dict
import git
from git import Repo, Actor
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class GitService:
    """Git版本控制服务"""
    
    def __init__(self, repo_path: Path):
        """
        初始化Git服务
        
        Args:
            repo_path: 仓库路径
        """
        self.repo_path = Path(repo_path)
        self.repo: Optional[Repo] = None
        
    def init_repository(self) -> None:
        """
        初始化Git仓库
        如果仓库已存在,则使用现有仓库
        """
        try:
            if (self.repo_path / '.git').exists():
                # 仓库已存在,直接打开
                self.repo = Repo(self.repo_path)
                logger.info(f"打开现有Git仓库: {self.repo_path}")
            else:
                # 创建新仓库
                self.repo = Repo.init(self.repo_path)
                logger.info(f"初始化新Git仓库: {self.repo_path}")
                
                # 创建初始提交
                self._create_initial_commit()
        except Exception as e:
            logger.error(f"初始化Git仓库失败: {e}")
            raise
    
    def _create_initial_commit(self) -> None:
        """创建初始提交"""
        try:
            # 创建 .gitignore
            gitignore_path = self.repo_path / '.gitignore'
            if not gitignore_path.exists():
                gitignore_content = """# Python
__pycache__/
*.py[cod]
*.so
.Python
env/
venv/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
"""
                gitignore_path.write_text(gitignore_content, encoding='utf-8')
            
            # 添加所有文件并提交
            self.repo.index.add(['*'])
            
            author = Actor("DreamPen System", "system@dreampen.ai")
            self.repo.index.commit(
                "Initial commit",
                author=author,
                committer=author
            )
            logger.info("创建初始提交成功")
        except Exception as e:
            logger.error(f"创建初始提交失败: {e}")
    
    def commit_changes(
        self,
        message: str,
        author_name: str,
        author_email: str,
        files: Optional[List[str]] = None
    ) -> str:
        """
        提交更改
        
        Args:
            message: 提交消息
            author_name: 作者名称
            author_email: 作者邮箱
            files: 要提交的文件列表,None表示提交所有更改
            
        Returns:
            提交的SHA值
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        try:
            # 添加文件
            if files:
                self.repo.index.add(files)
            else:
                # 添加所有更改(包括未跟踪的文件)
                self.repo.git.add(A=True)
            
            # 检查是否有更改
            if not self.repo.index.diff("HEAD") and not self.repo.untracked_files:
                logger.info("没有需要提交的更改")
                return ""
            
            # 创建提交
            author = Actor(author_name, author_email)
            commit = self.repo.index.commit(
                message,
                author=author,
                committer=author
            )
            
            logger.info(f"提交成功: {commit.hexsha[:8]} - {message}")
            return commit.hexsha
            
        except Exception as e:
            logger.error(f"提交失败: {e}")
            raise
    
    def get_commit_history(
        self,
        max_count: int = 50,
        file_path: Optional[str] = None
    ) -> List[Dict]:
        """
        获取提交历史
        
        Args:
            max_count: 最大返回数量
            file_path: 特定文件的历史(可选)
            
        Returns:
            提交历史列表
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        try:
            commits = []
            
            # 获取提交列表
            if file_path:
                commit_iter = self.repo.iter_commits(paths=file_path, max_count=max_count)
            else:
                commit_iter = self.repo.iter_commits(max_count=max_count)
            
            for commit in commit_iter:
                commits.append({
                    "sha": commit.hexsha,
                    "short_sha": commit.hexsha[:8],
                    "author": commit.author.name,
                    "email": commit.author.email,
                    "message": commit.message.strip(),
                    "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                    "timestamp": commit.committed_date
                })
            
            return commits
            
        except Exception as e:
            logger.error(f"获取提交历史失败: {e}")
            raise
    
    def get_commit_diff(self, commit_sha: str) -> str:
        """
        获取提交的变更内容
        
        Args:
            commit_sha: 提交SHA值
            
        Returns:
            diff内容
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        try:
            commit = self.repo.commit(commit_sha)
            
            # 如果是第一个提交,与空树比较
            if not commit.parents:
                diff = commit.diff(None, create_patch=True)
            else:
                diff = commit.diff(commit.parents[0], create_patch=True)
            
            # 格式化diff输出
            diff_text = []
            for d in diff:
                if d.diff:
                    diff_text.append(d.diff.decode('utf-8', errors='ignore'))
            
            return '\n'.join(diff_text)
            
        except Exception as e:
            logger.error(f"获取提交差异失败: {e}")
            raise
    
    def revert_to_commit(self, commit_sha: str) -> None:
        """
        回滚到特定提交
        
        Args:
            commit_sha: 目标提交的SHA值
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        try:
            # 硬重置到指定提交
            self.repo.git.reset('--hard', commit_sha)
            logger.info(f"成功回滚到提交: {commit_sha[:8]}")
            
        except Exception as e:
            logger.error(f"回滚失败: {e}")
            raise
    
    def get_file_at_commit(self, file_path: str, commit_sha: str) -> str:
        """
        获取特定提交时的文件内容
        
        Args:
            file_path: 文件路径(相对于仓库根目录)
            commit_sha: 提交SHA值
            
        Returns:
            文件内容
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        try:
            commit = self.repo.commit(commit_sha)
            blob = commit.tree / file_path
            return blob.data_stream.read().decode('utf-8')
            
        except Exception as e:
            logger.error(f"获取文件内容失败: {e}")
            raise
    
    def get_current_branch(self) -> str:
        """
        获取当前分支名
        
        Returns:
            分支名
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        return self.repo.active_branch.name
    
    def has_uncommitted_changes(self) -> bool:
        """
        检查是否有未提交的更改
        
        Returns:
            是否有未提交的更改
        """
        if not self.repo:
            return False
        
        return self.repo.is_dirty() or len(self.repo.untracked_files) > 0
    
    def get_status(self) -> Dict:
        """
        获取仓库状态
        
        Returns:
            状态信息
        """
        if not self.repo:
            raise RuntimeError("Git仓库未初始化")
        
        return {
            "branch": self.get_current_branch(),
            "has_changes": self.has_uncommitted_changes(),
            "untracked_files": self.repo.untracked_files,
            "modified_files": [item.a_path for item in self.repo.index.diff(None)],
            "staged_files": [item.a_path for item in self.repo.index.diff("HEAD")]
        }


class GitServiceFactory:
    """Git服务工厂"""
    
    @staticmethod
    def create(repo_path: Path) -> GitService:
        """
        创建Git服务实例
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            Git服务实例
        """
        service = GitService(repo_path)
        service.init_repository()
        return service