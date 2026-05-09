---
date: 2026-05-08
publish: true
published_at: 2026-05-09
title: CVE漏洞评估
categories:
  - Security
tags:
  - CVE
---

# 前言

# 背景

**CVE**（Common Vulnerabilities and Exposures，公共漏洞和暴露）是由 MITRE 组织维护的一套标准化漏洞命名体系，每个漏洞对应一个唯一编号，格式为 `CVE-年份-序号`，例如 `CVE-2024-12345`。

**CVSS**（Common Vulnerability Scoring System，通用漏洞评分系统）是评估漏洞严重程度的行业标准，评分范围为 0.0 ~ 10.0，通常划分为四个等级：

| 评分范围 | 等级 |
|----------|------|
| 9.0 ~ 10.0 | Critical 严重 |
| 7.0 ~ 8.9 | High 高危 |
| 4.0 ~ 6.9 | Medium 中危 |
| 0.1 ~ 3.9 | Low 低危 |

**NVD**（National Vulnerability Database）是美国国家漏洞数据库，基于 CVE 数据提供详细的漏洞分析和 CVSS 评分，是查询漏洞信息的主要来源。

**CWE**（Common Weakness Enumeration）是漏洞的"类型标签"，描述漏洞的根本成因，例如 CWE-119（缓冲区溢出）、CWE-78（命令注入）等。

# 查找漏洞

漏洞已经由 MITRE 正式分配编号并公开披露，NVD 完成了收录和分析。
https://nvd.nist.gov/vuln/detail/CVE-2008-1382


一般会显示github维护的仓库，但是是个issue，github毕竟多人参加，维护并不是十分规范，一个cve漏洞，可能有多个issue等问题，如果找到了cve对应的issue，但是没有找到commit，就可以借助ai查找这个issue对应的commit。


修复补丁，一个cve漏洞如果16版本出了问题，可能会在17版本以patch的形式合入，直到后面20或者21可能才去掉patch文件，把这个修复合入代码中。
