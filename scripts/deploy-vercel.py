#!/usr/bin/env python3
"""
Script para fazer deploy do promoterhub.vercel.app
Uso: python3 scripts/deploy-vercel.py
"""
import requests
import subprocess
import time
import json

TOKEN = "vcp_1SfhOpx1iD4iKVWunAp4vK0yFCN5u756mD4DJVsGnd0x3oN50b08U51d"
PROJECT_ID = "prj_ar305lMJZcFidTOLiGixDGsFYdAa"
REPO_ID = 1168037134

def get_current_sha():
    return subprocess.check_output(
        ["git", "-C", "/home/ubuntu/promoter_management", "rev-parse", "HEAD"]
    ).decode().strip()

def push_to_github():
    result = subprocess.run(
        ["git", "-C", "/home/ubuntu/promoter_management", "push", "github", "main", "--force"],
        capture_output=True, text=True
    )
    print("Push GitHub:", result.stdout or result.stderr)

def trigger_deploy(sha):
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    payload = {
        "name": "promoterhub",
        "gitSource": {"type": "github", "repoId": REPO_ID, "ref": "main", "sha": sha},
        "target": "production"
    }
    resp = requests.post(
        f"https://api.vercel.com/v13/deployments?projectId={PROJECT_ID}",
        headers=headers, json=payload
    )
    data = resp.json()
    return data.get("id")

def wait_for_deploy(deploy_id):
    headers = {"Authorization": f"Bearer {TOKEN}"}
    for i in range(20):
        time.sleep(20)
        resp = requests.get(f"https://api.vercel.com/v13/deployments/{deploy_id}", headers=headers)
        state = resp.json().get("readyState", "?")
        print(f"[{(i+1)*20}s] {state}")
        if state in ["READY", "ERROR", "CANCELED"]:
            return state
    return "TIMEOUT"

if __name__ == "__main__":
    print("1. Fazendo push para o GitHub...")
    push_to_github()
    sha = get_current_sha()
    print(f"2. SHA: {sha}")
    print("3. Acionando deploy na Vercel...")
    deploy_id = trigger_deploy(sha)
    print(f"4. Deploy ID: {deploy_id}")
    print("5. Aguardando build...")
    state = wait_for_deploy(deploy_id)
    if state == "READY":
        print("✅ Deploy concluído! https://promoterhub.vercel.app")
    else:
        print(f"❌ Deploy falhou: {state}")
