---
date: 2026-04-16
publish: true
published_at: 2026-05-15
title: python3.7和openssl版本不兼容
categories:
  - Linux
tags:
  - EnvSetup
---
# 前言

​	在linux中，python是必不可少的，linux安装之后也会有自带python。更常用的python版本是3.7，但是python3.7版本和openssl之间会因为openssl版本太低出现一些不兼容问题。

原本的openssl版本：1.1.1

想要替换的版本：1.1.1(虽然自带openssl版本就是1.1.1但是我在编译python3.7版本的时候，找不到自带版本的头文件位置，就自己重新编译一个相同的版本)

旧版本python：3.6

新版本python：3.7.0

# 解决方法

## 编译安装高版本的openssl

openssl版本查询

````
openssl version
````

拿到openssl的安装包。

```
wget https://www.openssl.org/source/openssl-1.1.1t.tar.gz
```

解压压缩包

```
tar xavf openssl-1.1.1t.tar.gz
```

指定安装目录

```
./config --prefix=/usr/local/openssl1.1.1/
```

编译安装

```
make && make install
```

## 配置环境



备份之前的旧版本的openssl链接（无论什么时候做备份都是个好习惯）

````
mv /usr/bin/openssl /usr/bin/openssl.bak
````

创建新版本的连接

```
/usr/bin# ln -s /usr/local/openssl1.1.1/bin/openssl openssl
ln -s /usr/local/openssl1.1.1/include/openssl/ /usr/include/openssl
```

将openssl新版本库路径添加到配置文件中

```
echo "/usr/local/openssl1.1.1/lib" >> /etc/ld.so.conf
# 使修改的文件生效
ldconfig -v
```

到这里还没有成功，而且是没有办法查看openssl的版本。

需要重新解压python源码编译安装。

## 编译python源码

wget拿到对应版本的python压缩包。我使用的是3.7.0版本的。

````
tar xavf Python-3.7.0.tar.xz
````

​	需要注意的是一定要指定openssl的安装路径，如果不指定，python编译找不到openssl的位置，没法编译openssl。无论如何更新python和openssl的版本都是不成功的。

````
./configure --with-openssl=/usr/local/openssl1.1.1/ --prefix=/usr/local/python3.7.0/
````

编译安装：

make && make install

建立链接

```
echo "/usr/local/python3.7.0/lib" >/etc/ld.so.conf.d/python3.conf
ldconfig -v
```

安装完成之后就能够正常使用，查看版本已经更新。

<div align="center"><img src="image-20230329175453256.png"></img>

并且通过pip可以安装其他包。

````shell
@ubuntu:~$ pip3 install --user meson
Collecting meson
  Using cached https://files.pythonhosted.org/packages/4f/54/0e79b014d6389cba46cfd15a27e178d1bd82559142a2c66eb43b1afa8d61/meson-1.0.1-py3-none-any.whl
Installing collected packages: meson
Successfully installed meson-1.0.1
You are using pip version 10.0.1, however version 23.0.1 is available.
You should consider upgrading via the 'pip install --upgrade pip' command.
````

