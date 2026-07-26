#!/usr/bin/env python3
"""
AIxcellentHealth-site 部署脚本（单提交版）

设计目标：每次发布只产生 **1 个干净提交**，告别之前逐文件 deploy:/clean stale:
的噪音提交。

原理（纯 GitHub Git API，不走 git 协议，规避沙箱代理对 git CONNECT 的限制）：
  1. 读取本地 spa-dist 全部文件
  2. 为每份文件创建 blob（POST /git/blobs）
  3. 组装整棵 tree（POST /git/trees），并保留仓库里的 README.md / .nojekyll
  4. 创建 commit（POST /git/commits），parent 指向当前 main
  5. 更新 main 引用（PATCH /git/refs/heads/main, force=true）

结果：一次部署 = 1 个提交，整棵树整体替换（旧文件自然消失，无需逐个删除）。

用法：
  python3 scripts/deploy_site.py            # 部署（默认 spa-dist）
  SPA=/path/to/dist python3 scripts/deploy_site.py
"""
import base64, os, subprocess, json, sys
from datetime import datetime

REPO = "WonderfulClaire/AIxcellentHealth-site"
BRANCH = "main"


def _find_spa():
    """从脚本所在目录向上查找含 spa-dist 的仓库根；找不到再退回 __file__/../spa-dist。"""
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        cand = os.path.join(d, "spa-dist")
        if os.path.isdir(cand):
            return cand
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return os.path.join(os.path.dirname(__file__), "..", "spa-dist")


SPA = os.environ.get("SPA") or _find_spa()
# 这些根文件不在 spa-dist 里，需从仓库当前 tree 继承，避免被整树替换清掉
KEEP = {"README.md", ".nojekyll"}


def gh(method, path, body=None):
    cmd = ["gh", "api", f"repos/{REPO}/{path}", "-X", method,
           "-H", "Accept: application/vnd.github+json"]
    if body is not None:
        cmd += ["--input", "-"]
        return subprocess.run(cmd, input=json.dumps(body), capture_output=True, text=True)
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    spa = os.path.abspath(SPA)
    if not os.path.isdir(spa):
        print(f"[x] spa-dist 不存在: {spa}")
        sys.exit(1)

    # 1) 收集本地文件
    local = []
    for root, _, files in os.walk(spa):
        for fn in files:
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, spa).replace(os.sep, "/")
            local.append((rel, full))
    local.sort()
    print(f"[*] 本地文件: {len(local)}")

    # 2) 当前 main HEAD + tree（用于保留 KEEP 文件）
    ref = gh("GET", f"git/refs/heads/{BRANCH}")
    if ref.returncode != 0:
        print("[x] 取 main 引用失败:", ref.stderr.strip()[:200]); sys.exit(1)
    head_sha = json.loads(ref.stdout)["object"]["sha"]

    tree_resp = gh("GET", f"git/trees/{head_sha}?recursive=1")
    keep_sha = {}
    if tree_resp.returncode == 0:
        for t in json.loads(tree_resp.stdout).get("tree", []):
            if t["type"] == "blob" and t["path"] in KEEP:
                keep_sha[t["path"]] = t["sha"]
    for k in KEEP:
        if k not in keep_sha:
            print(f"[!] 警告: 仓库当前 tree 中未找到 {k}，将不会被保留")

    # 3) 创建 blob
    entries = []
    ok = fail = 0
    for rel, full in local:
        with open(full, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        r = gh("POST", "git/blobs", {"content": b64, "encoding": "base64"})
        if r.returncode != 0:
            fail += 1
            print("  [x] blob 失败", rel, r.stderr.strip()[:120]); continue
        entries.append({"path": rel, "mode": "100644", "type": "blob",
                        "sha": json.loads(r.stdout)["sha"]})
        ok += 1
    for k in KEEP:
        if k in keep_sha:
            entries.append({"path": k, "mode": "100644", "type": "blob", "sha": keep_sha[k]})
    print(f"[*] blob 上传: ok={ok} fail={fail}  | tree 条目(含保留): {len(entries)}")
    if fail:
        print("[x] 有文件失败，中止"); sys.exit(1)

    # 4) 创建 tree
    tr = gh("POST", "git/trees", {"tree": entries})
    if tr.returncode != 0:
        print("[x] 创建 tree 失败:", tr.stderr.strip()[:200]); sys.exit(1)
    tree_sha = json.loads(tr.stdout)["sha"]

    # 5) 创建 commit
    msg = f"deploy: {datetime.now():%Y-%m-%d %H:%M} build"
    cr = gh("POST", "git/commits", {"message": msg, "tree": tree_sha, "parents": [head_sha]})
    if cr.returncode != 0:
        print("[x] 创建 commit 失败:", cr.stderr.strip()[:200]); sys.exit(1)
    commit_sha = json.loads(cr.stdout)["sha"]

    # 6) 更新 main 引用（强制，非快进）
    ur = gh("PATCH", f"git/refs/heads/{BRANCH}", {"sha": commit_sha, "force": True})
    if ur.returncode != 0:
        print("[x] 更新 main 失败:", ur.stderr.strip()[:200]); sys.exit(1)

    print(f"[✓] 部署完成，单次提交: {msg}")
    print(f"    提交: {commit_sha[:10]}")


if __name__ == "__main__":
    main()
