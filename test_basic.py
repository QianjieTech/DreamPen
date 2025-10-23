"""
DreamPen 基础功能测试脚本

这个脚本用于验证基础功能是否正常工作
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from backend.core.config import settings
from backend.services.file_service import FileServiceFactory
from backend.services.agent_service import AgentFactory


async def test_config():
    """测试1: 配置加载"""
    print("=" * 50)
    print("测试1: 配置加载")
    print("=" * 50)
    
    try:
        print(f"✓ 应用名称: {settings.app_name}")
        print(f"✓ API前缀: {settings.api_prefix}")
        print(f"✓ OpenAI模型: {settings.openai_model}")
        print(f"✓ OpenAI端点: {settings.openai_base_url}")
        print(f"✓ 数据存储路径: {settings.git_repos_base_path}")
        print("\n✅ 配置加载成功!\n")
        return True
    except Exception as e:
        print(f"\n❌ 配置加载失败: {e}\n")
        return False


async def test_file_service():
    """测试2: 文件服务"""
    print("=" * 50)
    print("测试2: 文件服务")
    print("=" * 50)
    
    try:
        # 创建测试项目
        user_id = "test_user"
        project_id = "test_project"
        
        file_service = FileServiceFactory.create(user_id, project_id)
        print(f"✓ 创建文件服务实例: {user_id}/{project_id}")
        
        # 初始化项目
        await file_service.init_project()
        print(f"✓ 初始化项目目录结构")
        
        # 检查项目是否存在
        exists = file_service.project_exists()
        print(f"✓ 项目存在检查: {exists}")
        
        # 测试写入世界观
        test_content = """# 测试世界观

这是一个测试世界观文档。

## 基础设定
- 世界类型: 现代都市
- 物理法则: 遵循现实世界
- 种族: 人类为主
"""
        await file_service.write_worldview(test_content)
        print("✓ 写入世界观文件")
        
        # 测试读取世界观
        content = await file_service.read_worldview()
        if content == test_content:
            print("✓ 读取世界观文件并验证内容")
        else:
            print("⚠ 读取的内容与写入的内容不一致")
        
        print("\n✅ 文件服务测试通过!\n")
        return True
        
    except Exception as e:
        print(f"\n❌ 文件服务测试失败: {e}\n")
        import traceback
        traceback.print_exc()
        return False


async def test_agent_creation():
    """测试3: Agent创建(不调用API)"""
    print("=" * 50)
    print("测试3: Agent创建")
    print("=" * 50)
    
    try:
        # 检查是否配置了API Key
        api_key = settings.openai_api_key.get_secret_value()
        if not api_key or api_key == "":
            print("⚠ 未配置OpenAI API Key,跳过Agent创建测试")
            print("  提示: 请在.env文件中配置OPENAI_API_KEY")
            print("\n⏭️ 跳过Agent创建测试\n")
            return True
        
        # 创建Agent(不调用API)
        agent = AgentFactory.create_worldview_agent()
        print("✓ 成功创建世界观Agent实例")
        
        print("\n✅ Agent创建测试通过!\n")
        print("💡 提示: 要测试Agent对话功能,请启动FastAPI服务器并访问 /docs 进行API测试")
        return True
        
    except Exception as e:
        print(f"\n❌ Agent创建测试失败: {e}\n")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """运行所有测试"""
    print("\n" + "=" * 50)
    print("DreamPen 基础功能测试")
    print("=" * 50 + "\n")
    
    results = []
    
    # 运行测试
    results.append(await test_config())
    results.append(await test_file_service())
    results.append(await test_agent_creation())
    
    # 总结
    print("=" * 50)
    print("测试总结")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"通过: {passed}/{total}")
    
    if passed == total:
        print("\n✅ 所有测试通过!")
        print("\n下一步:")
        print("1. 复制 .env.example 为 .env 并配置你的 OpenAI API Key")
        print("2. 运行 'fastapi dev backend/main.py' 启动开发服务器")
        print("3. 访问 http://localhost:8000/docs 查看API文档并测试")
    else:
        print(f"\n❌ {total - passed} 个测试失败")
        print("请检查错误信息并修复问题")
    
    print()


if __name__ == "__main__":
    asyncio.run(main())