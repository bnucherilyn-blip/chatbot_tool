import { useEffect, useState } from "react";
import { Button, Progress, Card, Typography, Tabs, Statistic, Space, Empty, Tag, Segmented, Input, Alert, message, Form } from "antd";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  FileTextOutlined,
  LoginOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import CharacterTable from "./components/CharacterTable";
import ResultView from "./components/ResultView";
import type { CharacterInput, CharacterResult, ModelConfig, ModelTestResult, PromptConfig } from "./api";
import { clearStoredAuthToken, generateCharacters, getDefaultModelConfig, getDefaultPrompts, getStoredAuthToken, login, setStoredAuthToken, testModelConfig } from "./api";
import "./App.css";

const { Title, Text, Paragraph } = Typography;

const DEFAULT_ROW: CharacterInput = {
  key: "1",
  name: "",
  gender: "",
  age: "",
  role_type: "",
  personality: "",
  occupation: "",
  scenario: "",
  language: "English",
};

const PROMPT_STORAGE_KEY = "character-studio-prompt-config";
const MODEL_STORAGE_KEY = "character-studio-model-config";
const AUTH_USER_STORAGE_KEY = "chatbot-tool-auth-user";

const EMPTY_PROMPT_CONFIG: PromptConfig = {
  persona_prompt: "",
  intro_prompt: "",
};

const EMPTY_MODEL_CONFIG: ModelConfig = {
  base_url: "",
  model: "",
  api_key: "",
};

function App() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getStoredAuthToken()));
  const [authUser, setAuthUser] = useState(localStorage.getItem(AUTH_USER_STORAGE_KEY) || "");
  const [loginLoading, setLoginLoading] = useState(false);
  const [characters, setCharacters] = useState<CharacterInput[]>([DEFAULT_ROW]);
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [promptConfig, setPromptConfig] = useState<PromptConfig>(EMPTY_PROMPT_CONFIG);
  const [defaultPrompts, setDefaultPrompts] = useState<PromptConfig>(EMPTY_PROMPT_CONFIG);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(EMPTY_MODEL_CONFIG);
  const [defaultModelConfig, setDefaultModelConfig] = useState<ModelConfig>(EMPTY_MODEL_CONFIG);
  const [testingModel, setTestingModel] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<ModelTestResult | null>(null);
  const validCount = characters.filter((c) => c.name.trim() && c.personality.trim()).length;

  useEffect(() => {
    if (!isAuthed) return;

    const loadSettings = async () => {
      try {
        const defaults = await getDefaultPrompts();
        const modelDefaults = await getDefaultModelConfig();
        setDefaultPrompts(defaults);
        setDefaultModelConfig(modelDefaults);

        const savedPrompts = localStorage.getItem(PROMPT_STORAGE_KEY);
        const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
        if (savedPrompts) {
          setPromptConfig(JSON.parse(savedPrompts));
        } else {
          setPromptConfig(defaults);
        }

        if (savedModel) {
          setModelConfig(JSON.parse(savedModel));
        } else {
          setModelConfig(modelDefaults);
        }
      } catch {
        message.error("默认设置加载失败，请重新登录后再试");
      }
    };

    loadSettings();
  }, [isAuthed]);

  useEffect(() => {
    if (!promptConfig.persona_prompt && !promptConfig.intro_prompt) return;
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(promptConfig));
  }, [promptConfig]);

  useEffect(() => {
    if (!modelConfig.base_url && !modelConfig.model && !modelConfig.api_key) return;
    localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(modelConfig));
  }, [modelConfig]);

  const handleGenerate = async () => {
    const valid = characters.filter((c) => c.name.trim() && c.personality.trim());
    if (valid.length === 0) return;

    try {
      setLoading(true);
      setResults([]);
      setProgress({ current: 0, total: valid.length });

      const collected: CharacterResult[] = [];
      await generateCharacters(valid, promptConfig, modelConfig, (index, total, result) => {
        collected.push(result);
        setResults([...collected]);
        setProgress({ current: index + 1, total });
      });
    } catch {
      message.error("生成请求失败，请确认后端服务和 API Key 配置正常");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoginLoading(true);
    try {
      const result = await login(values.username, values.password);
      setStoredAuthToken(result.token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, result.username);
      setAuthUser(result.username);
      setIsAuthed(true);
      message.success("登录成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredAuthToken();
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setAuthUser("");
    setIsAuthed(false);
    message.success("已退出登录");
  };

  const resetPrompts = () => {
    setPromptConfig(defaultPrompts);
    message.success("已恢复默认 Prompt");
  };

  const resetModelConfig = () => {
    setModelConfig((current) => ({
      ...defaultModelConfig,
      api_key: current.api_key,
    }));
    message.success("已恢复默认模型地址和型号");
  };

  const handleTestModel = async () => {
    setTestingModel(true);
    setModelTestResult(null);
    try {
      const result = await testModelConfig(modelConfig);
      setModelTestResult(result);
      if (result.ok) {
        message.success("模型连接测试成功");
      } else {
        message.error("模型连接测试失败");
      }
    } catch {
      message.error("模型连接测试请求失败");
    } finally {
      setTestingModel(false);
    }
  };

  const batchGenerateTab = (
    <div className="workspace-grid">
      <section className="main-column">
        <Card
          title="输入角色信息"
          extra={<Tag color="blue">必填：姓名 / 核心画像</Tag>}
          className="panel-card"
        >
          <CharacterTable data={characters} onChange={setCharacters} />
        </Card>

        <div className="action-bar">
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={validCount === 0}
          >
            批量生成
          </Button>
          {loading && (
            <Progress
              percent={Math.max(1, Math.round((progress.current / progress.total) * 100))}
              format={() => `${progress.current}/${progress.total}`}
              className="generation-progress"
            />
          )}
        </div>

        <ResultView results={results} />
      </section>

      <aside className="side-column">
        <Card className="panel-card compact-card">
          <Statistic title="待生成角色" value={validCount} suffix={`/ ${characters.length}`} />
        </Card>
        <Card className="panel-card compact-card">
          <Statistic title="已生成结果" value={results.length} />
        </Card>
        <Card title="生成建议" className="panel-card helper-card">
          <Space orientation="vertical" size={10}>
            <Text>核心画像越具体，输出越稳定。</Text>
            <Text>初始场景适合填写角色第一次出场的情境。</Text>
            <Text>上传表格时保持表头和当前字段一致。</Text>
          </Space>
        </Card>
      </aside>
    </div>
  );

  const templatesTab = (
    <div className="placeholder-grid">
      {[
        ["剧情向角色", "适合长篇故事、互动小说、角色扮演。"],
        ["陪伴型角色", "偏日常对话、情绪支持、轻互动。"],
        ["专业顾问", "适合知识型、行业型、任务型人设。"],
      ].map(([title, desc]) => (
        <Card key={title} className="template-card">
          <FileTextOutlined className="template-icon" />
          <Title level={5}>{title}</Title>
          <Paragraph type="secondary">{desc}</Paragraph>
          <Button type="link">查看模板</Button>
        </Card>
      ))}
    </div>
  );

  const historyTab = (
    <Card className="panel-card empty-panel">
      <Empty description="暂无生成记录">
        <Text type="secondary">后续可以在这里展示历史批次、导出文件和失败重试入口。</Text>
      </Empty>
    </Card>
  );

  const settingsTab = (
    <div className="settings-stack">
      <Card title="生成偏好" className="panel-card settings-panel">
        <div className="setting-row">
          <div>
            <Text strong>默认输出语言</Text>
            <Paragraph type="secondary">新建角色时使用的语言偏好。</Paragraph>
          </div>
          <Segmented options={["English", "中文", "日本語"]} defaultValue="English" />
        </div>
        <div className="setting-row">
          <div>
            <Text strong>结果展示密度</Text>
            <Paragraph type="secondary">控制结果表格的阅读节奏。</Paragraph>
          </div>
          <Segmented options={["紧凑", "标准", "宽松"]} defaultValue="标准" />
        </div>
      </Card>

      <Card
        title="模型服务配置"
        extra={
          <Space>
            <Button onClick={handleTestModel} loading={testingModel}>
              测试连接
            </Button>
            <Button onClick={resetModelConfig}>恢复默认</Button>
          </Space>
        }
        className="panel-card settings-panel"
      >
        <Alert
          type="info"
          showIcon
          title="兼容 OpenAI Chat Completions 格式的模型服务"
          description="服务地址填写完整 chat/completions 接口；API Key 会保存在当前浏览器本地，不会写入默认配置接口。Key 留空时后端会使用环境变量 DEEPSEEK_API_KEY。"
          className="prompt-alert"
        />
        <div className="model-form">
          <label className="field-block">
            <span>模型服务地址</span>
            <Input
              value={modelConfig.base_url}
              onChange={(e) =>
                setModelConfig((current) => ({ ...current, base_url: e.target.value }))
              }
              placeholder="https://api.deepseek.com"
            />
          </label>
          <label className="field-block">
            <span>模型型号</span>
            <Input
              value={modelConfig.model}
              onChange={(e) =>
                setModelConfig((current) => ({ ...current, model: e.target.value }))
              }
              placeholder="deepseek-chat"
            />
          </label>
          <label className="field-block">
            <span>API Key</span>
            <Input.Password
              value={modelConfig.api_key}
              onChange={(e) =>
                setModelConfig((current) => ({ ...current, api_key: e.target.value }))
              }
              placeholder="留空则使用后端环境变量 DEEPSEEK_API_KEY"
            />
          </label>
        </div>
        {modelTestResult && (
          <Alert
            type={modelTestResult.ok ? "success" : "error"}
            showIcon
            title={modelTestResult.ok ? "模型连接测试成功" : "模型连接测试失败"}
            description={
              <pre className="test-result">
                {JSON.stringify(modelTestResult, null, 2)}
              </pre>
            }
            className="prompt-alert model-test-result"
          />
        )}
      </Card>

      <Card
        title="Prompt 配置"
        extra={<Button onClick={resetPrompts}>恢复默认</Button>}
        className="panel-card prompt-panel"
      >
        <Alert
          type="info"
          showIcon
          title="这里配置的是两段系统 Prompt"
          description="第一段用于生成完整人设，第二段用于根据人设生成角色简介和开场白。修改后会自动保存到当前浏览器，并在下一次批量生成时生效。"
          className="prompt-alert"
        />

        <div className="prompt-editor-grid">
          <label className="prompt-editor">
            <span>人设生成 Prompt</span>
            <Input.TextArea
              value={promptConfig.persona_prompt}
              onChange={(e) =>
                setPromptConfig((current) => ({ ...current, persona_prompt: e.target.value }))
              }
              autoSize={{ minRows: 16, maxRows: 28 }}
              placeholder="配置用于生成完整角色人设的系统 Prompt"
            />
          </label>

          <label className="prompt-editor">
            <span>简介 / 开场白 Prompt</span>
            <Input.TextArea
              value={promptConfig.intro_prompt}
              onChange={(e) =>
                setPromptConfig((current) => ({ ...current, intro_prompt: e.target.value }))
              }
              autoSize={{ minRows: 16, maxRows: 28 }}
              placeholder="配置用于生成 introduction 和 prologue 的系统 Prompt"
            />
          </label>
        </div>
      </Card>
    </div>
  );

  if (!isAuthed) {
    return (
      <div className="login-shell">
        <Card className="login-card">
          <div className="login-brand">
            <span className="login-mark">ct</span>
            <div>
              <Text className="eyebrow">chatbot_tool</Text>
              <Title level={2}>登录工作台</Title>
            </div>
          </div>
          <Paragraph type="secondary">
            输入授权账号后继续使用批量生成人设、模型配置和 Prompt 设置。
          </Paragraph>
          <Form
            layout="vertical"
            onFinish={handleLogin}
            initialValues={{ username: "xuan.zhang@js.design" }}
            requiredMark={false}
          >
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, message: "请输入账号" }]}
            >
              <Input autoComplete="username" placeholder="xuan.zhang@js.design" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password autoComplete="current-password" placeholder="请输入密码" />
            </Form.Item>
            <Button
              block
              type="primary"
              size="large"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={loginLoading}
            >
              登录
            </Button>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <Text className="eyebrow">AI Character Studio</Text>
          <Title level={2}>角色人设工作台</Title>
          <Paragraph>
            集中维护角色输入、批量生成、模板沉淀和结果管理，让人设生产流程更清晰。
          </Paragraph>
        </div>
        <div className="hero-stats">
          <Statistic title="表格行数" value={characters.length} />
          <Statistic title="有效输入" value={validCount} />
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
          {authUser && <Text type="secondary">{authUser}</Text>}
        </div>
      </header>

      <Tabs
        className="workspace-tabs"
        defaultActiveKey="batch"
        items={[
          {
            key: "batch",
            label: (
              <span>
                <AppstoreOutlined />
                批量生成人设
              </span>
            ),
            children: batchGenerateTab,
          },
          {
            key: "templates",
            label: (
              <span>
                <FileTextOutlined />
                模板库
              </span>
            ),
            children: templatesTab,
          },
          {
            key: "history",
            label: (
              <span>
                <ClockCircleOutlined />
                生成记录
              </span>
            ),
            children: historyTab,
          },
          {
            key: "settings",
            label: (
              <span>
                <ControlOutlined />
                设置
              </span>
            ),
            children: settingsTab,
          },
        ]}
      />
    </div>
  );
}

export default App;
