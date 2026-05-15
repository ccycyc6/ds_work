# 哈夫曼树创建过程交互演示

这是一个用于数据结构课程作业的静态网页项目，展示哈夫曼树从优先队列到最终编码表的逐步构建过程。

## 本地预览

在项目目录中运行：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://localhost:8000/
```

## 说明文档

PDF 文档为 `report.pdf`。如需重新编译：

```bash
xelatex report.tex
xelatex report.tex
```

## GitHub Pages 部署

仓库地址：

```text
https://github.com/ccycyc6/ds_work
```

部署步骤：

1. 将本项目推送到 `main` 分支。
2. 打开仓库的 `Settings`。
3. 进入 `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。
6. 保存后访问：

```text
https://ccycyc6.github.io/ds_work/
```

## 输入格式

支持逗号或换行分隔，例如：

```text
A:5, B:9, C:12, D:13, E:16, F:45
```

每一项必须是 `字符:正整数`，字符不能重复。
