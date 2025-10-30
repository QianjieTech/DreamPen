/**
 * 文件树组件
 */
import React, { useState } from 'react';
import { Tree, Input, Button, Space, message, App, Dropdown, Modal } from 'antd';
import type { TreeDataNode, MenuProps } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { FileNode } from '../../types/project';

interface FileTreeProps {
  files: FileNode[];
  onFileSelect?: (file: FileNode) => void;
  onFileCreate?: (filePath: string) => Promise<void>;
  onFolderCreate?: (folderPath: string) => Promise<void>;
  onFileDelete?: (filePath: string) => Promise<void>;
}

const FileTree: React.FC<FileTreeProps> = ({ files, onFileSelect, onFileCreate, onFolderCreate, onFileDelete }) => {
  const { modal } = App.useApp();
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [selectedParentPath, setSelectedParentPath] = useState<string>('');

  // 将 FileNode 转换为 Ant Design Tree 所需的数据格式
  const convertToTreeData = (nodes: FileNode[]): TreeDataNode[] => {
    return nodes.map((node) => ({
      key: node.path,
      title: node.name,
      icon:
        node.type === 'directory' ? (
          expandedKeys.includes(node.path) ? (
            <FolderOpenOutlined />
          ) : (
            <FolderOutlined />
          )
        ) : (
          <FileTextOutlined />
        ),
      children: node.children ? convertToTreeData(node.children) : undefined,
      isLeaf: node.type === 'file',
    }));
  };

  const treeData = convertToTreeData(files);

  // 处理文件选择
  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0 && onFileSelect) {
      const selectedPath = selectedKeys[0] as string;
      const findNode = (nodes: FileNode[], path: string): FileNode | null => {
        for (const node of nodes) {
          if (node.path === path) return node;
          if (node.children) {
            const found = findNode(node.children, path);
            if (found) return found;
          }
        }
        return null;
      };
      const selectedNode = findNode(files, selectedPath);
      if (selectedNode && selectedNode.type === 'file') {
        onFileSelect(selectedNode);
      }
    }
  };

  // 处理展开/收起
  const handleExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchValue(value);
    // TODO: 实现搜索过滤逻辑
  };

  // 打开创建文件对话框
  const handleCreateFile = () => {
    setIsCreatingFolder(false);
    setSelectedParentPath('');
    setNewFileName('');
    setIsModalVisible(true);
  };

  // 打开创建文件夹对话框
  const handleCreateFolder = () => {
    setIsCreatingFolder(true);
    setSelectedParentPath('');
    setNewFileName('');
    setIsModalVisible(true);
  };

  // 确认创建
  const handleConfirmCreate = async () => {
    if (!newFileName.trim()) {
      message.warning('请输入文件名');
      return;
    }

    const fileName = newFileName.trim();
    const fullPath = selectedParentPath ? `${selectedParentPath}/${fileName}` : fileName;

    try {
      if (isCreatingFolder) {
        await onFolderCreate?.(fullPath);
        message.success('文件夹创建成功');
      } else {
        await onFileCreate?.(fullPath);
        message.success('文件创建成功');
      }
      setIsModalVisible(false);
      setNewFileName('');
    } catch (error) {
      message.error(isCreatingFolder ? '文件夹创建失败' : '文件创建失败');
      console.error('创建错误:', error);
    }
  };

  // 处理删除文件
  const handleDeleteFile = (filePath: string, fileName: string) => {
    console.log('🔵 FileTree.handleDeleteFile 被调用');
    console.log('  - filePath:', filePath);
    console.log('  - fileName:', fileName);
    
    console.log('🔵 正在创建确认对话框...');
    
    // 使用 modal.confirm 显示确认对话框
    const modalInstance = modal.confirm({
      title: '确认删除',
      content: `确定要删除 "${fileName}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        console.log('🔵 用户确认删除');
        try {
          console.log('🔵 调用 onFileDelete...');
          if (!onFileDelete) {
            console.error('❌ onFileDelete 回调未定义！');
            message.error('删除功能未配置');
            return;
          }
          await onFileDelete(filePath);
          console.log('✅ 删除回调完成');
          message.success('文件删除成功');
        } catch (error) {
          console.error('❌ 删除错误:', error);
          message.error('文件删除失败');
        }
      },
      onCancel: () => {
        console.log('⚠️ 用户取消删除');
      },
    });
    
    console.log('🔵 确认对话框已创建:', modalInstance);
  };

  // 右键菜单
  const getContextMenu = (node: FileNode): MenuProps['items'] => {
    console.log('🔵 getContextMenu 被调用, node:', node.name, 'type:', node.type);
    
    if (node.type === 'directory') {
      console.log('  → 返回文件夹菜单');
      return [
        {
          key: 'new-file',
          icon: <FileAddOutlined />,
          label: '新建文件',
          onClick: () => {
            console.log('📁 点击：新建文件');
            setIsCreatingFolder(false);
            setSelectedParentPath(node.path);
            setNewFileName('');
            setIsModalVisible(true);
          },
        },
        {
          key: 'new-folder',
          icon: <FolderAddOutlined />,
          label: '新建文件夹',
          onClick: () => {
            console.log('📁 点击：新建文件夹');
            setIsCreatingFolder(true);
            setSelectedParentPath(node.path);
            setNewFileName('');
            setIsModalVisible(true);
          },
        },
      ];
    } else {
      // 文件右键菜单
      console.log('  → 返回文件菜单（带删除选项）');
      return [
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: '删除',
          danger: true,
          onClick: () => {
            console.log('🗑️ 点击：删除菜单项');
            handleDeleteFile(node.path, node.name);
          },
        },
      ];
    }
  };

  // 渲染带右键菜单的树节点
  const renderTreeNode = (node: FileNode) => {
    const menuItems = getContextMenu(node);
    
    if (menuItems && menuItems.length > 0) {
      return (
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
          <span>{node.name}</span>
        </Dropdown>
      );
    }
    return <span>{node.name}</span>;
  };

  // 更新 tree data 以支持右键菜单
  const convertToTreeDataWithMenu = (nodes: FileNode[]): TreeDataNode[] => {
    return nodes.map((node) => ({
      key: node.path,
      title: renderTreeNode(node),
      icon:
        node.type === 'directory' ? (
          expandedKeys.includes(node.path) ? (
            <FolderOpenOutlined />
          ) : (
            <FolderOutlined />
          )
        ) : (
          <FileTextOutlined />
        ),
      children: node.children ? convertToTreeDataWithMenu(node.children) : undefined,
      isLeaf: node.type === 'file',
    }));
  };

  const treeDataWithMenu = convertToTreeDataWithMenu(files);

  return (
    <div className="h-full flex flex-col" style={{ background: '#fafafa' }}>
      {/* 工具栏 */}
      <div
        className="p-3"
        style={{
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
        }}
      >
        <Space direction="vertical" className="w-full" size="small">
          <Input
            placeholder="搜索文件..."
            prefix={<SearchOutlined style={{ color: '#667eea' }} />}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{
              borderRadius: '8px',
              border: '1.5px solid #e2e8f0',
              transition: 'all 0.3s ease',
            }}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleCreateFile}
            className="w-full"
            style={{
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
            }}
          >
            新建文件
          </Button>
        </Space>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-auto p-2">
        {files.length === 0 ? (
          <div
            className="text-center mt-8"
            style={{ color: '#94a3b8' }}
          >
            <p>📁 暂无文件</p>
            <p className="text-xs mt-2">点击上方按钮创建文件</p>
          </div>
        ) : (
          <Tree
            showIcon
            treeData={treeDataWithMenu}
            onSelect={handleSelect}
            onExpand={handleExpand}
            expandedKeys={expandedKeys}
            className="bg-transparent"
            style={{
              background: 'transparent',
            }}
          />
        )}
      </div>

      {/* 创建文件/文件夹对话框 */}
      <Modal
        title={isCreatingFolder ? '新建文件夹' : '新建文件'}
        open={isModalVisible}
        onOk={handleConfirmCreate}
        onCancel={() => setIsModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {selectedParentPath ? `在 ${selectedParentPath}/ 下创建` : '在根目录下创建'}
          </p>
          <Input
            placeholder={isCreatingFolder ? '输入文件夹名称' : '输入文件名 (如: chapter1.md)'}
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onPressEnter={handleConfirmCreate}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default FileTree;