import { useState } from "react";
import { Button, Progress, Card, Typography } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import CharacterTable from "./components/CharacterTable";
import ResultView from "./components/ResultView";
import type { CharacterInput, CharacterResult } from "./api";
import { generateCharacters } from "./api";

const { Title } = Typography;

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

function App() {
  const [characters, setCharacters] = useState<CharacterInput[]>([DEFAULT_ROW]);
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleGenerate = async () => {
    const valid = characters.filter((c) => c.name.trim() && c.personality.trim());
    if (valid.length === 0) return;

    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: valid.length });

    const collected: CharacterResult[] = [];
    await generateCharacters(valid, (index, total, result) => {
      collected.push(result);
      setResults([...collected]);
      setProgress({ current: index + 1, total });
    });

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <Title level={3}>角色人设批量生成工具</Title>

      <Card title="输入角色信息" style={{ marginBottom: 16 }}>
        <CharacterTable data={characters} onChange={setCharacters} />
      </Card>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={handleGenerate}
          disabled={!characters.some((c) => c.name.trim() && c.personality.trim())}
        >
          批量生成
        </Button>
        {loading && (
          <Progress
            percent={Math.round((progress.current / progress.total) * 100)}
            format={() => `${progress.current}/${progress.total}`}
            style={{ width: 200 }}
          />
        )}
      </div>

      <ResultView results={results} />
    </div>
  );
}

export default App;
