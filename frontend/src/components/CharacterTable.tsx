import type { DragEvent } from "react";
import { useState } from "react";
import { Table, Input, Button, Space, message, Modal } from "antd";
import { PlusOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import type { CharacterInput } from "../api";
import { uploadFile } from "../api";

interface Props {
  data: CharacterInput[];
  onChange: (data: CharacterInput[]) => void;
}

const COLUMNS_CONFIG = [
  { key: "name", title: "姓名 Name *", width: 120 },
  { key: "gender", title: "性别 Gender", width: 80 },
  { key: "age", title: "年龄 Age", width: 80 },
  { key: "role_type", title: "角色类型 Role Type", width: 130 },
  { key: "personality", title: "核心画像 Personality *", width: 200 },
  { key: "occupation", title: "职业 Occupation", width: 140 },
  { key: "scenario", title: "初始场景 Scenario", width: 200 },
  { key: "language", title: "语言 Language", width: 100 },
];

export default function CharacterTable({ data, onChange }: Props) {
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");

  const handleCellChange = (key: string, field: string, value: string) => {
    onChange(data.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    const newRow: CharacterInput = {
      key: String(Date.now()),
      name: "",
      gender: "",
      age: "",
      role_type: "",
      personality: "",
      occupation: "",
      scenario: "",
      language: "English",
    };
    onChange([...data, newRow]);
  };

  const deleteRow = (key: string) => {
    onChange(data.filter((row) => row.key !== key));
  };

  const handleUpload = async (file: File) => {
    try {
      const characters = await uploadFile(file);
      onChange(characters);
      message.success(`已导入 ${characters.length} 条数据`);
    } catch {
      message.error("文件解析失败");
    }
    return false;
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleUpload(file);
  };

  const importCsvText = () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      message.error("请粘贴包含表头和至少一行数据的 CSV");
      return;
    }

    const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
    const fieldMap: Record<string, keyof CharacterInput> = {
      姓名: "name",
      name: "name",
      性别: "gender",
      gender: "gender",
      年龄: "age",
      age: "age",
      角色类型: "role_type",
      role_type: "role_type",
      核心画像: "personality",
      性格画像: "personality",
      personality: "personality",
      职业: "occupation",
      occupation: "occupation",
      初始场景: "scenario",
      场景: "scenario",
      scenario: "scenario",
      语言: "language",
      language: "language",
    };

    const imported = lines.slice(1).map((line, index) => {
      const values = line.split(",").map((item) => item.trim());
      const row: CharacterInput = {
        key: String(Date.now() + index),
        name: "",
        gender: "",
        age: "",
        role_type: "",
        personality: "",
        occupation: "",
        scenario: "",
        language: "English",
      };
      headers.forEach((header, columnIndex) => {
        const field = fieldMap[header];
        if (field) row[field] = values[columnIndex] || "";
      });
      return row;
    });

    onChange(imported);
    setPasteModalOpen(false);
    setCsvText("");
    message.success(`已导入 ${imported.length} 条数据`);
  };

  const columns = [
    ...COLUMNS_CONFIG.map(({ key, title, width }) => ({
      title,
      dataIndex: key,
      width,
      render: (text: string, record: CharacterInput) => (
        <Input
          value={text}
          size="small"
          onChange={(e) => handleCellChange(record.key, key, e.target.value)}
        />
      ),
    })),
    {
      title: "操作",
      width: 60,
      render: (_: any, record: CharacterInput) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => deleteRow(record.key)}
        />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          添加行
        </Button>
        <Button onClick={() => setPasteModalOpen(true)}>粘贴 CSV 导入</Button>
      </Space>
      <div
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <InboxOutlined />
        <span>也可以把 CSV / Excel 文件拖到这里导入</span>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
      />
      <Modal
        title="粘贴 CSV 导入"
        open={pasteModalOpen}
        onCancel={() => setPasteModalOpen(false)}
        onOk={importCsvText}
        okText="导入"
        cancelText="取消"
      >
        <Input.TextArea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          autoSize={{ minRows: 8, maxRows: 16 }}
          placeholder={"姓名,核心画像,语言\nAlice,quiet designer,English"}
        />
      </Modal>
    </div>
  );
}
