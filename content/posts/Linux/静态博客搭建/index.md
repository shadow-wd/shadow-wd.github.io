---
publish: true
published_at: 2026-04-16
title: 静态博客搭建
tags:
categories:
  - Linux
---
# 前言

hugo主题网站：
https://themes.gohugo.io/

个人博客主页：
https://shadow-wd.github.io/

参考主题博客：
https://www.trrw.tech/p/hugo-stack%E4%B8%BB%E9%A2%98%E9%85%8D%E7%BD%AE/

# 页面框架

主页：http://localhost:1313/    
配置文件：content\\\_index.md

文章首页：http://localhost:1313/posts/
配置文件：content\posts\\\_index.md

about界面：http://localhost:1313/about/
配置文件：content\about.md

contact界面:  http://localhost:1313/contact/
配置文件：content\contact.md

## 文章
hugo.toml文件中表明了文章就是存放在content\posts下面
```
  [[menu.main]]
    name = "Articles"
    url = "/posts/"
    weight = 2
```

文章界面的配置文件就是post文件夹下的_index.md


# 主题

以ananke主题为例
需要注意的是ananke官方的readme更新不及时，是master分支的readme，默认现在都是main分支。

2026.04.09更改为stack主题

## 环境
主题管理使用go管理
go的安装官网：
https://go.dev/dl/

## 主题安装
Ananke 是 Hugo 官方默认的基础主题，Hugo Module 是现代化推荐安装方式，Git Submodule 是传统旧版方案。

根目录的hugo.toml就是主题的配置文件，修改在这个文件，不要修改主题源代码。

==这个主题默认就是黑白配色，需要自己配置==


## 更换主题

比如更换成
https://themes.gohugo.io/themes/hugo-theme-stack/

下载之后，放到themes\stack下面
修改主题名字hugo.toml
```
theme = "ananke"
```

这样只是应用了主题，但是一些css配置并没有生效，需要将主题的配置文件拿出来。

themes\stack\demo\config\\\_default 复制到config\\\_default
并且删除关于module的配置（因为我是下载主题，没有通过git管理，通过git管理这部分可能因为网络问题报错）
```
[[module.imports]]
    path = "github.com/CaiJimmy/hugo-theme-stack/v3"

[pagination]
    pagerSize = 5

[permalinks]
    post = "/p/:slug/"
    page = "/:slug/"

[services.disqus]
    shortname = "hugo-theme-stack"

```

==需要注意的是，后续如果更改头像，颜色等等这些，都是更改`config\_default`下的配置文件即可==
根文件的hugo.toml可以删除了，防止和config下面配置文件冲突。


## 更换头像

`config\_default\params.toml`

```
[sidebar]
    emoji    = "✏️"
    subtitle = "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    avatar   = "img/avatar.jpg"
```
这里对应的就是侧边栏头像，头像图片存放位置
`assets\img\avatar.jpg`

## 添加文章头图
单个文章添加的话：
添加image字段，图片就放到文件同级目录。
```
---
title: "Contact"
date: 2024-01-01
layout: "page"
slug: "contact"
image: "header_images.png"
menu:
    main:
        weight: 5
        params:
            icon: mail
---
```


# 笔记格式
hugo对md的格式还不太一样，需要进行一些配置设置。
hugo.toml

## 更新commit时间
```
[frontmatter]
  date = ["published_at", "date"]
```

## 换行
如果不添加，markdown上传网页默认不换行的。
```
[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      hardWraps = true
```
## 文章标题
hugo只会识别文章中title作为标题
```
title = 'Hello World'
```


# 文章上传
我使用obsidian编写笔记文档，所以是在这个软件上开发上传文档到hugo网站的功能。

目标：Obsidian Shell Commands添加脚本，右键需要提交的文件提交，具体执行实现在脚本中。

参考文章：
https://ihave.news/post/20240818194015.html

## 环境配置

脚本的执行离不开bash.exe命令，所以把这个命令加入到环境变量中，这样就不需要固定命令路径。
添加到windows环境变量中：
```
C:\Program Files\Git\bin\bash.exe
```

上传笔记位置：
content\posts
对应图片附件位置：
static\images


# 测试开发

拉起本地测试，和部署到github page显示效果一样，本地测试完成之后，再提交到github上。

```
hugo server --minify
```

