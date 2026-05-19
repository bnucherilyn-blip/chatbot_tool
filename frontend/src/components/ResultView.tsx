import { Table, Button, Modal, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { CharacterResult } from "../api";
import { exportResults } from "../api";

interface Props {
  results: CharacterResult[];
}

export default function ResultView({ results }: Props) {
  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const showDetail = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
  };

  const columns = [
    { title: "姓名", dataIndex: "name", width: 100 },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (s: string, record: CharacterResult) => {
        const color = s === "done" ? "green" : s.includes("error") ? "red" : "blue";
        if (s.includes("error") && record.error) {
          return (
            <Tag color={color} onClick={() => showDetail(`${record.name} - 错误详情`, record.error)}>
              {s}
            </Tag>
          );
        }
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: "错误详情",
      dataIndex: "error",
      ellipsis: true,
      render: (text: string, record: CharacterResult) =>
        text ? (
          <a onClick={() => showDetail(`${record.name} - 错误详情`, text)}>
            {text.slice(0, 80)}
            {text.length > 80 ? "..." : ""}
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: "人设 Prompt",
      dataIndex: "persona_prompt",
      ellipsis: true,
      render: (text: string, record: CharacterResult) => (
        <a onClick={() => showDetail(`${record.name} - 人设`, text)}>
          {text ? text.slice(0, 60) + "..." : record.error ? "查看错误" : "-"}
        </a>
      ),
    },
    {
      title: "角色简介",
      dataIndex: "introduction",
      ellipsis: true,
      render: (text: string, record: CharacterResult) => (
        <a onClick={() => showDetail(`${record.name} - 简介`, text)}>
          {text || "-"}
        </a>
      ),
    },
    {
      title: "开场白",
      dataIndex: "prologue",
      ellipsis: true,
      render: (text: string, record: CharacterResult) => (
        <a onClick={() => showDetail(`${record.name} - 开场白`, text)}>
          {text || "-"}
        </a>
      ),
    },
  ];

  if (results.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>生成结果</h3>
        <Button icon={<DownloadOutlined />} onClick={() => exportResults(results)}>
          导出 Excel
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={results.map((r, i) => ({ ...r, key: String(i) }))}
        rowKey="key"
        pagination={false}
        size="small"
      />
      <Modal
        title={modalTitle}
        open={!!modalContent}
        onCancel={() => setModalContent("")}
        footer={null}
        width={700}
      >
        <pre style={{ whiteSpace: "pre-wrap", maxHeight: 500, overflow: "auto" }}>
          {modalContent}
        </pre>
      </Modal>
    </div>
  );
}
