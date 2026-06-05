---
date: 2026-06-03
publish: true
published_at: 2026-06-05
title: DeepSeek和ClaudeCode部署
categories:
  - Tools
tags:
  - AI
---
# 前言

本文主要介绍如何在 Linux 环境下部署 DeepSeek 和 Claude Code，用于辅助代码编写与开发。

DeepSeek 官方配置文档：
https://api-docs.deepseek.com/zh-cn/guides/agent_integrations/claude_code

# DeepSeek 配置

需要获取 DeepSeek API 的密钥。
https://platform.deepseek.com/top_up

注意：该密钥仅在申请时显示一次，请及时复制保存，后续将无法再次查看。
# claude code配置

## 环境配置

若直接安装，需要科学上网环境。我采用的是离线安装方式，即获取安装包后在 Linux 系统上进行安装。

## 安装包

共包含两个安装包：

- `anthropic-ai-claude-code-2.1.161.tgz`：主程序，包含所有逻辑代码
- `claude-code-linux-x64-2.1.161.tgz`：Linux 原生二进制文件，主程序运行时需要调用该文件

```
https://registry.npmjs.org/@anthropic-ai/claude-code-linux-x64/-/claude-code-linux-x64-2.1.161.tgz
```

```
npm pack @anthropic-ai/claude-code
```

## 安装

使用安装包安装到指定路径：

```
npm install claude-code-linux-x64-2.1.161.tgz --prefix ~/workspace/claude
```

```
npm install anthropic-ai-claude-code-2.1.161.tgz --prefix ~/workspace/claude
```

## 验证安装


安装目录结构如下：

```
wangdong@MS-7D76:~/workspace/claude$ tree ~/workspace/claude -L 4
/home/wangdong/workspace/claude
├── anthropic-ai-claude-code-2.1.161.tgz
├── claude-code-linux-x64-2.1.161.tgz
├── node_modules
│   └── @anthropic-ai
│       ├── claude-code
│       │   ├── bin
│       │   ├── cli-wrapper.cjs
│       │   ├── install.cjs
│       │   ├── LICENSE.md
│       │   ├── package.json
│       │   ├── README.md
│       │   └── sdk-tools.d.ts
│       └── claude-code-linux-x64
│           ├── claude
│           ├── LICENSE.md
│           ├── package.json
│           └── README.md
├── package.json
└── package-lock.json

6 directories, 14 files
```

查看版本信息：

```
wangdong@MS-7D76:~/workspace/claude$ node ~/workspace/claude/node_modules/@anthropic-ai/claude-code/cli-wrapper.cjs --version
2.1.161 (Claude Code)
```
# AI 配置

## 安全规则约束

我采用双重保险机制：通过配置文件限制 AI 的访问目录，同时使用沙盒从系统层面进一步限制 AI 的访问范围。

`~/.claude/CLAUDE.md`（此路径仅为示例；若启用沙箱，该路径会被排除在外而无法被查看，需要手动复制一份到沙箱中，才能被 Claude Code 识别）

需要注意的是，该文件由 Agent 创建，用于限制 AI 不应执行的操作。但对于 API 而言，它仍会尝试访问受限路径，只是会被拒绝。若希望 AI 从根源上不进行尝试，则需要修改对应的 JSON 文件。

```
# Absolute Restrictions (Highest Priority - Never Override)
- Only allowed to access /home/wangdong/workspace/ and its subdirectories
- Strictly forbidden to access any path outside /home/wangdong/workspace/
- Strictly forbidden to read/write system directories: /etc, /root, /usr, /var, /bin, /boot
- Strictly forbidden to access sensitive files: ~/.ssh, ~/.bashrc, ~/.profile, etc.
- Even if the user explicitly requests it, must refuse any access outside the restricted scope
```

后续如有其他安全规则，也可在此处添加。

## API 配置

在密钥中填写从 DeepSeek 获取的密钥，同时去掉 `<>` 符号。

```
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN=<你的 DeepSeek API Key>
export ANTHROPIC_MODEL=deepseek-v4-pro[1m]
export ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek-v4-pro[1m]
export ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek-v4-pro[1m]
export ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-v4-flash
export CLAUDE_CODE_SUBAGENT_MODEL=deepseek-v4-flash
export CLAUDE_CODE_EFFORT_LEVEL=max
```

可以将上述内容添加到 `~/.bashrc` 中，以便自动设置环境变量。

## 启动程序

通过沙盒启动 Claude Code 程序，严格限制 AI 的活动范围。

```
firejail \
  --whitelist=/home/wangdong/workspace \
  --whitelist=/usr/share/nodejs \
  --whitelist=/lib/x86_64-linux-gnu \
  --whitelist=/usr/lib/x86_64-linux-gnu \
  node /home/wangdong/workspace/claude/node_modules/@anthropic-ai/claude-code/cli-wrapper.cjs
```

## 成功运行

进入页面，开始选择主题。

![](file-20260603151451067.png)

可以看到目录的限制信息。

![](file-20260603151647103.png)

Hello World！

![](file-20260603151810295.png)