"""
测试 API 端点的简单脚本
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_create_file():
    """测试创建文件"""
    url = f"{BASE_URL}/api/projects/test-project/files/create"
    data = {
        "file_path": "test_file.md",
        "content": "# Test File\n\nThis is a test.",
        "user_id": "test-user"
    }
    
    print(f"Testing POST {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_save_file():
    """测试保存文件"""
    url = f"{BASE_URL}/api/projects/test-project/files/README.md"
    data = {
        "content": "# Updated README\n\nThis has been updated.",
        "user_id": "test-user"
    }
    
    print(f"Testing POST {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_get_file_tree():
    """测试获取文件树"""
    url = f"{BASE_URL}/api/projects/test-project/files"
    params = {"user_id": "test-user"}
    
    print(f"Testing GET {url}")
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

if __name__ == "__main__":
    print("=" * 60)
    print("API 测试脚本")
    print("=" * 60)
    print()
    
    try:
        print("1. 测试获取文件树")
        test_get_file_tree()
        
        print("2. 测试创建文件")
        test_create_file()
        
        print("3. 测试保存文件")
        test_save_file()
        
        print("4. 再次获取文件树（验证创建）")
        test_get_file_tree()
        
        print("✅ 所有测试完成！")
        
    except Exception as e:
        print(f"❌ 错误: {e}")