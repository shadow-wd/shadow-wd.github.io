---
date: 2026-07-09
publish: true
published_at: 2026-07-10
title: Yocto构建系统封装
categories:
  - Linux
tags:
  - Yocto
---
# 前言


> 用途：封装 Yocto SDK 编译环境，提供统一的项目配置、构建、打包入口。
> 适用场景：Qualcomm / Rockchip 等平台的 Yocto/BitBake 项目，需要在上游 SDK 之上叠加自有修改。

---

# 设计动机

Yocto 上游 SDK 通常是一个庞大的目录（包含 bitbake 工具链、layers、recipes、downloads、sstate-cache 等），直接在其中开发会有以下问题：

| 问题        | 说明                                                |
| --------- | ------------------------------------------------- |
| **污染基线**  | 定制代码与上游 SDK 源码混在一起，升级困难                           |
| **入口分散**  | `source setup-environment` + `bitbake` 命令需要记忆多个参数 |
| **多项目共用** | 同一份 SDK 可能服务于多个项目/硬件平台，需要隔离配置                     |
| **固件打包**  | 编译产物散落在 Yocto 输出目录，需要手动收集和重命名                     |

**解决方案**：在 SDK 上层建立一个薄封装层，通过脚本将"配置 → 覆写 → 构建 → 打包"流程标准化。

---

对于非Yocto开发者来说，学习Yocto开发的时间成本较高，使用封装层可以在一定程度上降低Yocto开发难度。

# 整体架构

```
<PROJECT_ROOT>/                        # 项目根目录（如 6490_UBUN10_AP）
├── apps_proc/                         # Yocto SDK 主目录（上游基线，只读）
└── sunsea/                            # ★ 集成编译封装层（本项目）
    ├── build.sh -> scripts/build.sh   # 统一入口
    ├── README                         # 简要说明
    ├── .gitignore                     # 忽略生成文件
    ├── scripts/
    │   ├── build.sh                   # 核心脚本（配置/构建/打包/清理）
    │   └── config.sh                  # 运行时配置（由 -c 命令生成）
    ├── documents/                     # 项目文档
    ├── firmware/                      # 打包后的固件输出（由 -x/-p 生成）
    ├── logs/                          # 构建日志（按时间戳命名）
    └── projects/                      # 各项目定制文件
        └── SIM9650/
            ├── apps_proc/             # 覆写文件（目录结构与 SDK 一致）
```

**核心原则**：

- `apps_proc/` 是上游基线，**只读**（除通过 `-c` 配置时覆写）
- `sunsea/` 只存放**差异部分**：脚本、文档、项目覆写文件、输出产物
- 项目间通过 `projects/<ProjectName>/` 隔离

---

# 核心工作流

## 配置阶段（`-c`）

```bash
./build.sh -c <ProjectName> <Variant>
```

**执行流程**：

```
do_config()
  ├── 1. 校验参数（项目名是否存在、Variant 是否合法）
  ├── 2. 根据 Variant 设定编译类型变量
  │        debug  → BUILD_YOCTO_RELEASE_NAME=debug,  BUILD_KERNEL_RELEASE_NAME=consolidate
  │        user   → BUILD_YOCTO_RELEASE_NAME=user,   BUILD_KERNEL_RELEASE_NAME=consolidate
  │        perf   → BUILD_YOCTO_RELEASE_NAME=perf,   BUILD_KERNEL_RELEASE_NAME=gki
  ├── 3. 生成 scripts/config.sh（基础环境变量）
  ├── 4. 复制项目覆写文件到 SDK
  │        cp projects/<ProjectName>/apps_proc/* → apps_proc/
  └── 5. 执行 deepConfig.sh（平台特定扩展配置）
           ├── 追加 MACHINE/DISTRO/YOCTO_NAME/输出路径 到 config.sh
           └── 可选的额外操作（删文件、打补丁、git 操作等）
```

**`scripts/config.sh` 最终内容示例**：

```bash
#!/bin/bash

export SDK_DIR_PATH=/home/wangdong/workspace/6490_UBUN10_AP/apps_proc
export APVERSION_DIR_PATH=/.../apps_proc/src/kernel/msm-5.4/init/version.c
export BUILD_PROJECT_NAME=SIM9650
export BUILD_YOCTO_RELEASE_NAME=debug
export BUILD_MACHINE_NAME=qcs6490-odk
export BUILD_DISTRO_NAME=qti-distro-ubuntu-fullstack-debug
export BUILD_YOCTO_NAME=qti-ubuntu-robotics-image
export YOCTO_OUT_DIR_PATH=$SDK_DIR_PATH/build-qti-distro-ubuntu-fullstack-debug/tmp-glibc/deploy/images/qcs6490-odk
export BUILD_OUT_FILE_LIST=(
    "abl.elf"
    "qti-ubuntu-robotics-image-qcs6490-odk-boot.img"
    "full_update_ext4.zip"
    ...
)
```

## 构建阶段（`-b` / `-x`）

```bash
./build.sh -b all       # 全量 Yocto 构建
./build.sh -b yocto     # 同上
./build.sh -b <recipe>  # 单 recipe 构建（先 cleansstate 再编译）
./build.sh -x           # 全量构建 + 自动打包固件
```

**构建流程**：

```
build_yocto()
  ├── 1. 进入 SDK 目录，校验 downloads/ 是否存在
  ├── 2. source setup-environment（MACHINE=xxx DISTRO=xxx）
  └── 3. bitbake <target-image>

build_recipe()           # 用于调试单个 recipe
  ├── 1. source setup-environment
  └── 2. bitbake -c cleansstate <recipe> && bitbake <recipe>
```

## 打包阶段（`-p`）

```bash
./build.sh -p all       # 收集固件到 firmware/ 目录
```

**打包逻辑**：

```
copy_firmware()
  ├── 1. 创建 firmware/ 目录
  ├── 2. 从 version.c 提取版本号（如 SIM8918B01V01_SS_L515）
  ├── 3. 遍历 BUILD_OUT_FILE_LIST，从 Yocto 输出目录复制文件
  │      - full_update_ext4.zip → <版本号>-ota-userdebug_AB.zip（重命名）
  │      - 其他文件保持原名
  └── 4. 为每个文件生成 MD5 校验和 → firmware/md5.txt
```

## 清理阶段（`-d`）

```bash
./build.sh -d all       # 清理 Yocto 输出 + sunsea 生成文件
./build.sh -d yocto     # 仅清理 Yocto 输出（build-* 和 sstate-cache）
```

## 日志

所有操作通过 `tee` 同步输出到 `logs/build_<时间戳>.log`，方便回溯。

```bash
# build.sh 末尾
main "$@" 2>&1 | tee logs/build_$(date +"%Y%m%d_%H%M%S").log
```

---

#  项目扩展模式

## 添加新项目

```
projects/
└── NewProject/
    ├── apps_proc/           # 需要覆写的文件（保持与 SDK 相同的目录结构）
    │   └── poky/
    │       └── meta-xxx/
    │           └── recipes-xxx/
    │               └── <custom>.bb / <.bbappend>
    └── deepConfig.sh        # 平台特定配置（必须）
```

## deepConfig.sh 模板

```bash
#!/bin/bash

# ---------- 必填：平台标识 ----------
BUILD_MACHINE_NAME=<machine-name>          # 如 qcs6490-odk
BUILD_DISTRO_NAME=<distro>-${BUILD_YOCTO_RELEASE_NAME}  # ${BUILD_YOCTO_RELEASE_NAME} 由 -c 参数传入
BUILD_YOCTO_NAME=<target-image>           # bitbake 目标
YOCTO_OUT_DIR_PATH=$SDK_DIR_PATH/build-${BUILD_DISTRO_NAME}/tmp-glibc/deploy/images/${BUILD_MACHINE_NAME}

# ---------- 必填：输出文件列表 ----------
BUILD_OUT_FILE_LIST=(
    "abl.elf"
    "boot.img"
    "full_update_ext4.zip"
    "vmlinux"
    "sysfs.ext4"
)

# ---------- 可选：扩展环境变量 ----------
function do_deepEnv() {
    logi "Appending to configuration file ..."
    echo "export BUILD_MACHINE_NAME=$BUILD_MACHINE_NAME"   >> $SUNSEA_DIR_PATH/scripts/config.sh
    echo "export BUILD_DISTRO_NAME=$BUILD_DISTRO_NAME"     >> $SUNSEA_DIR_PATH/scripts/config.sh
    echo "export BUILD_YOCTO_NAME=$BUILD_YOCTO_NAME"       >> $SUNSEA_DIR_PATH/scripts/config.sh
    echo "export YOCTO_OUT_DIR_PATH=$YOCTO_OUT_DIR_PATH"   >> $SUNSEA_DIR_PATH/scripts/config.sh
    echo "export BUILD_OUT_FILE_LIST=("                    >> $SUNSEA_DIR_PATH/scripts/config.sh
    for file in ${BUILD_OUT_FILE_LIST[@]}; do
        echo "\"$file\""                                   >> $SUNSEA_DIR_PATH/scripts/config.sh
    done
    echo ")"                                               >> $SUNSEA_DIR_PATH/scripts/config.sh
}

do_deepEnv
```

## Yocto Layer 覆写机制

覆写文件放在 `projects/<ProjectName>/apps_proc/` 下，目录结构与 SDK 完全一致。配置阶段通过 `cp -rf` 整体复制到 SDK 目录。

**典型覆写场景**：

| 类型        | 示例路径                                    | 说明             |
| ----------- | ------------------------------------------- | ---------------- |
| 新增 recipe | `poky/meta-xxx/recipes-xxx/<name>.bb`       | 全新的软件包配方 |
| bbappend    | `poky/meta-xxx/recipes-xxx/<name>.bbappend` | 扩展现有 recipe  |
| 配置文件    | `poky/meta-xxx/conf/layer.conf`             | Layer 配置       |
| 补丁文件    | `poky/meta-xxx/recipes-xxx/files/<patch>`   | 源码补丁         |

---

# 脚本设计要点

## 变量分层

```
build.sh 内部变量
  ├── SUNSEA_DIR_PATH         # sunsea/ 绝对路径（脚本所在位置）
  ├── SDK_DIR_PATH            # apps_proc/ 绝对路径（realpath 计算得出）
  └── APVERSION_DIR_PATH      # version.c 路径（用于提取版本号）
  
config.sh 生成变量（由 -c 命令 + deepConfig.sh 写入）
  ├── BUILD_PROJECT_NAME      # 项目名
  ├── BUILD_YOCTO_RELEASE_NAME# 构建变体 (debug/user/perf)
  ├── BUILD_MACHINE_NAME      # Yocto MACHINE
  ├── BUILD_DISTRO_NAME       # Yocto DISTRO
  ├── BUILD_YOCTO_NAME        # bitbake 目标 image/recipe
  ├── YOCTO_OUT_DIR_PATH      # Yocto 部署目录
  └── BUILD_OUT_FILE_LIST     # 需收集的固件文件列表
```

## 错误处理模式

```bash
# 目录校验
cd $SDK_DIR_PATH || { loge "Cannot enter directory"; exit 1; }

# 文件校验
if [ ! -e "$SDK_DIR_PATH/downloads" ]; then
    loge "downloads directory does not exist, please check if it has been extracted!"
    exit 1
fi

# 管道状态检查
bitbake $BUILD_YOCTO_NAME
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    exit 1
fi
```

## 日志输出

```bash
logi() { echo -e "\033[0;32m $*\033[0m"; }    # 绿色 — 信息
logw() { echo -e "\033[0;33m $*\033[0m"; }    # 黄色 — 警告
loge() { echo -e "\033[0;31m $*\033[0m"; }    # 红色 — 错误
```

## 版本号提取

从内核 `version.c` 中自动提取版本字符串，用于固件文件重命名：

```bash
# version.c 示例内容:
# ... "SIM8918B01V01_SS_L515\n" ...

AP_VERSION=$(grep -oP '(?<= )[A-Z0-9_]+(?=\\n";)' "$APVERSION_DIR_PATH")
# 结果: SIM8918B01V01_SS_L515
```

---

# Yocto 构建加速

```bash
# 并行任务数（在 build.sh 中设定）
export PARALLEL_MAKE="-j16"
export BB_NUMBER_THREADS="16"
```

- `PARALLEL_MAKE`：控制 `make` 的并行编译任务数
- `BB_NUMBER_THREADS`：控制 BitBake 同时执行的 recipe 任务数
- 增量编译：Yocto 自带 sstate-cache 机制，重复构建只编译变更部分
- 当增量编译出现异常时，可注释掉 build.sh 中的 `bitbake -c cleansstate` 清理代码

---

# 常用操作速查

```bash
# 初始配置
./build.sh -c SIM9650 debug

# 全量构建 + 打包
./build.sh -x

# 仅构建
./build.sh -b all

# 单独编译某个 recipe（调试用）
./build.sh -b <recipe-name>

# 打包固件
./build.sh -p all

# 清理全部构建产物
./build.sh -d all

# 仅清理 Yocto 输出
./build.sh -d yocto

# 查看帮助
./build.sh
```

---

# 适配新平台的 Checklist

- [ ] 在 `projects/` 下创建 `<PlatformName>/` 目录
- [ ] 编写 `deepConfig.sh`（至少含 MACHINE、DISTRO、IMAGE、输出文件列表）
- [ ] 在 `projects/<PlatformName>/apps_proc/` 下放置需要覆写的 Yocto layer 文件
- [ ] 如有额外定制逻辑，在 `deepConfig.sh` 的 `do_deepConfig()` 中实现
- [ ] 更新本文档中的平台列表

---

# 设计模式总结

| 模式               | 说明                                                         |
| ------------------ | ------------------------------------------------------------ |
| **覆写隔离**       | 定制文件通过 `cp -rf` 覆写到 SDK，保持基线纯洁               |
| **两阶段配置**     | `-c` 生成基础变量 → `deepConfig.sh` 追加平台变量 + 执行定制操作 |
| **符号链接入口**   | `build.sh -> scripts/build.sh`，项目根目录简洁               |
| **时间戳日志**     | `logs/build_YYYYMMDD_HHMMSS.log`，不覆盖历史                 |
| **MD5 校验**       | 每个固件文件生成 MD5，方便验证完整性                         |
| **版本号自动提取** | 从 `version.c` 提取，避免手动维护版本字符串                  |
