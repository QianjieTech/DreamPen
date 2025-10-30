/**
 * 项目列表页面 - 用户登录后的首页
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Empty, message, Modal, Form, Input, Spin, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { projectAPI } from '../api/project';
import type { ProjectListItem } from '../types/project';
import Layout from '../components/Layout';

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await projectAPI.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 创建新项目
  const handleCreateProject = async (values: { name: string; description?: string }) => {
    try {
      const result = await projectAPI.createProject(values);
      message.success('项目创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      await loadProjects();
      // 自动进入新创建的项目
      navigate(`/project/${result.project_id}`);
    } catch (error: any) {
      console.error('创建项目失败:', error);
      message.error(error?.response?.data?.detail || '创建项目失败');
    }
  };

  // 删除项目
  const handleDeleteProject = async (projectId: string) => {
    try {
      await projectAPI.deleteProject(projectId);
      message.success('项目已删除');
      await loadProjects();
    } catch (error) {
      console.error('删除项目失败:', error);
      message.error('删除项目失败');
    }
  };

  // 打开项目
  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Spin size="large" tip="加载中..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="p-8 h-full overflow-auto"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* 头部 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1
                className="text-3xl font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.5px',
                }}
              >
                我的项目
              </h1>
              <p className="text-gray-600">选择一个项目开始创作，或创建新的项目</p>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              style={{
                height: '48px',
                fontSize: '16px',
                fontWeight: 500,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                padding: '0 24px',
                transition: 'all 0.3s ease',
              }}
            >
              创建新项目
            </Button>
          </div>

          {/* 项目卡片网格 */}
          {projects.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
              <Empty
                description="还没有项目，创建一个开始吧"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  style={{
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: 500,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  创建第一个项目
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  hoverable
                  className="transition-all duration-300"
                  onClick={() => handleOpenProject(project.project_id)}
                  style={{
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    overflow: 'hidden',
                  }}
                  actions={[
                    <Button
                      type="text"
                      icon={<FolderOpenOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProject(project.project_id);
                      }}
                      style={{
                        color: '#667eea',
                        fontWeight: 500,
                      }}
                    >
                      打开
                    </Button>,
                    <Popconfirm
                      title="确定要删除这个项目吗？"
                      description="删除后无法恢复"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteProject(project.project_id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontWeight: 500,
                        }}
                      >
                        删除
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <div
                        className="text-lg font-semibold truncate"
                        style={{ color: '#1e293b', marginBottom: '8px' }}
                      >
                        📝 {project.name}
                      </div>
                    }
                    description={
                      <div>
                        <p className="text-gray-600 line-clamp-2 min-h-[40px] text-sm">
                          {project.description || '暂无描述'}
                        </p>
                        <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
                          🕒 {new Date(project.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建项目弹窗 */}
      <Modal
        title="创建新项目"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { min: 2, message: '项目名称至少2个字符' },
              { max: 50, message: '项目名称最多50个字符' },
            ]}
          >
            <Input placeholder="例如：我的第一本小说" />
          </Form.Item>
          <Form.Item
            name="description"
            label="项目描述"
            rules={[
              { max: 200, message: '描述最多200个字符' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="简单描述一下这个项目..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ProjectList;