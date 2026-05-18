import { useState } from "react";
import { Table, Input, Button, Space, Upload, message } from "antd";
import { PlusOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
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
        <Upload accept=".csv,.xlsx,.xls" showUploadList={false} beforeUpload={handleUpload}>
          <Button icon={<UploadOutlined />}>上传 CSV/Excel</Button>
        </Upload>
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
      />
    </div>
  );
}
