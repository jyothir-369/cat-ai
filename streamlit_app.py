"""
Enterprise Platform Management Operations Dashboard.
Streamlit-based user interface connecting to the FastAPI backend microservices.
"""

import streamlit as st
import requests
import pandas as pd
from datetime import datetime

# ── Configuration & State Initializations ────────────────────────────────────
st.set_page_config(
    page_title="Platform Admin Dashboard",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

BACKEND_URL = "http://127.0.0.1:8000"

if "token" not in st.session_state:
    st.session_state["token"] = ""
if "authenticated" not in st.session_state:
    st.session_state["authenticated"] = False

# ── API Helper Integration Layer ─────────────────────────────────────────────
def get_headers():
    return {
        "Authorization": f"Bearer {st.session_state['token']}",
        "Content-Type": "application/json"
    }

def fetch_admin_data(endpoint: str):
    try:
        response = requests.get(f"{BACKEND_URL}{endpoint}", headers=get_headers())
        if response.status_code == 200:
            return response.json(), True
        elif response.status_code in [401, 403]:
            return f"Authorization Error: {response.json().get('detail', 'Access Denied')}", False
        else:
            return f"Server Error: {response.status_code}", False
    except Exception as e:
        return f"Connection Matrix Failure: {str(e)}", False


# ── Sidebar Authentication Layer ─────────────────────────────────────────────
with st.sidebar:
    st.title("🔒 Security Access Control")
    st.markdown("---")
    
    if not st.session_state["authenticated"]:
        st.subheader("Administrative Login")
        jwt_input = st.text_area("Paste Global Superadmin JWT Access Token:", height=150)
        if st.button("Authenticate Session", use_container_width=True):
            if jwt_input.strip():
                st.session_state["token"] = jwt_input.strip()
                st.session_state["authenticated"] = True
                st.success("Token locked into memory state!")
                st.rerun()
            else:
                st.error("Token field cannot be empty.")
    else:
        st.success("🛡️ Session Authenticated")
        if st.button("Clear Credentials & Logout", use_container_width=True):
            st.session_state["token"] = ""
            st.session_state["authenticated"] = False
            st.rerun()

    st.markdown("---")
    st.caption("System Environment: **Development**")
    st.caption(f"Backend Target Node: `{BACKEND_URL}`")


# ── Main Application Dashboard Workspace ─────────────────────────────────────
st.title("⚡ Platform-Wide Administrative Operations Dashboard")
st.markdown("Provides real-time analytics indicators, multi-tenant boundaries tracking, and audit metrics logs.")

# Liveness System Probe Display
try:
    health_resp = requests.get(f"{BACKEND_URL}/admin/health")
    if health_resp.status_code == 200:
        health_data = health_resp.json()
        if health_data.get("status") == "ok":
            st.success(f"🟢 Core Service Operational | Database Link: {health_data.get('db', 'ok')}")
        else:
            st.warning("⚠️ Core Service Degradation Detected")
    else:
        st.error(f"🔴 Service Unreachable (Status {health_resp.status_code})")
except Exception:
    st.error("🔴 Fatal: Local FastAPI Service Node Unreachable on Port 8000")

# Restrict viewing metrics tabs if unauthorized
if not st.session_state["authenticated"]:
    st.info("Please insert your cryptographic platform token signature inside the sidebar module to uncouple metrics logging visualizers.")
else:
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 System Infrastructure Performance Metrics", 
        "👥 Identities Tracking Index", 
        "🏢 Multi-Tenant Workspaces Isolation", 
        "📜 Compliance Audit Ledger Logs"
    ])

    # ── Tab 1: Platform Performance Analytics Metrics ───────────────────────────
    with tab1:
        st.header("Platform Infrastructure Performance Analytics (30-Day Windows)")
        metrics, success = fetch_admin_data("/admin/metrics")
        
        if success:
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Cumulative Profiles Index", f"{metrics.get('total_users'):,}")
            col2.metric("Active Rolling Identities (30d)", f"{metrics.get('active_users_30d'):,}")
            col3.metric("Tenant Isolated Workspaces", f"{metrics.get('total_orgs'):,}")
            col4.metric("Aggregated Conversations Nodes", f"{metrics.get('total_conversations'):,}")
            
            st.markdown("---")
            col5, col6, col7 = st.columns(3)
            col5.metric("Transactional Pipeline Index (30d)", f"{metrics.get('total_requests_30d'):,}")
            col6.metric("Input/Output Token Stream (30d)", f"{metrics.get('total_tokens_30d'):,}")
            col7.metric("Operational Clearing Expense (USD)", f"${metrics.get('total_cost_usd_30d'):,.4f}")
        else:
            st.error(metrics)

    # ── Tab 2: User Profiles Directory Index ─────────────────────────────────
    with tab2:
        st.header("Identities Tracking & Access Clearances Directory")
        
        search_query = st.text_input("Fuzzy Text Match Lookup (Filter names or registration emails):", "")
        endpoint = f"/admin/users?limit=50&search={search_query}" if search_query else "/admin/users?limit=50"
        
        users, success = fetch_admin_data(endpoint)
        if success:
            if users:
                df_users = pd.DataFrame(users)
                # Re-organize layout visualization criteria cleanly
                df_users = df_users[["id", "email", "name", "is_active", "is_superadmin", "created_at"]]
                st.dataframe(df_users, use_container_width=True)
            else:
                st.info("No matching registration profile datasets recorded inside this database slice.")
        else:
            st.error(users)

    # ── Tab 3: Multi-Tenant Workspace Clusters ───────────────────────────────
    with tab3:
        st.header("Registered Multi-Tenant Isolation Environments")
        orgs, success = fetch_admin_data("/admin/orgs?limit=50")
        
        if success:
            if orgs:
                df_orgs = pd.DataFrame(orgs)
                st.dataframe(df_orgs, use_container_width=True)
            else:
                st.info("No isolated organizational infrastructure records found.")
        else:
            st.error(orgs)

    # ── Tab 4: Security Compliance Logs ──────────────────────────────────────
    with tab4:
        st.header("System Structural Audit & Compliance Ledger")
        st.markdown("Immutable record trace tracking pipeline event logs across multi-tenant context clusters.")
        
        logs, success = fetch_admin_data("/admin/audit-logs?limit=50")
        if success:
            if logs:
                df_logs = pd.DataFrame(logs)
                st.dataframe(df_logs, use_container_width=True)
            else:
                st.info("No structural compliance audit records recorded within the current ledger window.")
        else:
            st.error(logs)