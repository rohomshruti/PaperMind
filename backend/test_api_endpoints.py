import sys
import os
import time
import subprocess
import requests
import pymupdf as fitz

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def generate_pdf(filepath, title, dataset, model, result):
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((50, 50), f"Paper: {title}\nProblem: Automated Crop Diagnosis\nDataset: {dataset}\nMethod: Transfer Learning\nModel: {model}\nResult: {result}\nConclusion: Successful test.", fontsize=12)
    doc.save(filepath)
    doc.close()

def run_api_tests():
    print("=== Testing PaperMind FastAPI Live Endpoints ===")
    pdf_path1 = os.path.abspath("test_paper_alpha.pdf")
    pdf_path2 = os.path.abspath("test_paper_beta.pdf")
    generate_pdf(pdf_path1, "AlphaNet Research", "PlantVillage", "ResNet-50", "94.2% accuracy")
    generate_pdf(pdf_path2, "BetaNet Research", "ImageNet-Agri", "EfficientNet-B4", "96.1% accuracy")

    # Start uvicorn process
    python_exe = os.path.abspath(".venv/Scripts/python.exe")
    server_process = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8008"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=os.path.abspath(os.path.dirname(__file__))
    )

    base_url = "http://127.0.0.1:8008"
    try:
        # Wait for server to become responsive
        connected = False
        for _ in range(30):
            try:
                res = requests.get(f"{base_url}/health", timeout=2)
                if res.status_code == 200:
                    connected = True
                    break
            except Exception:
                time.sleep(0.5)

        assert connected, "Server failed to start within timeout"
        print("[OK] Server started and /health responded with 200 OK.")
        print(f"-> Health data: {res.json()}")

        # Test Dashboard Stats
        res_stats = requests.get(f"{base_url}/papers/stats/dashboard")
        assert res_stats.status_code == 200
        print(f"[OK] GET /papers/stats/dashboard responded with: {res_stats.json()}")

        # Test Uploading Papers
        with open(pdf_path1, "rb") as f1, open(pdf_path2, "rb") as f2:
            files = [
                ("files", ("test_paper_alpha.pdf", f1, "application/pdf")),
                ("files", ("test_paper_beta.pdf", f2, "application/pdf")),
            ]
            res_upload = requests.post(f"{base_url}/papers/upload", files=files)
        
        assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
        upload_data = res_upload.json()
        print(f"[OK] POST /papers/upload succeeded. Indexed {upload_data['total_uploaded']} papers.")
        assert len(upload_data["papers"]) == 2
        paper1_id = upload_data["papers"][0]["id"]
        paper2_id = upload_data["papers"][1]["id"]

        # Test Listing Papers
        res_list = requests.get(f"{base_url}/papers")
        assert res_list.status_code == 200
        papers_list = res_list.json()
        print(f"[OK] GET /papers returned {len(papers_list)} papers.")
        assert len(papers_list) >= 2

        # Test Chat Q&A
        chat_payload = {
            "question": "What dataset was used in AlphaNet?",
            "history": [],
            "paper_ids": [paper1_id]
        }
        res_chat = requests.post(f"{base_url}/chat", json=chat_payload)
        assert res_chat.status_code == 200, f"Chat failed: {res_chat.text}"
        chat_data = res_chat.json()
        print(f"[OK] POST /chat succeeded. Answer: {chat_data['answer'][:80]}...")
        print(f"-> Sources: {chat_data['sources']}")
        assert len(chat_data["sources"]) > 0

        # Test Summary Endpoint
        res_summary = requests.post(f"{base_url}/papers/{paper1_id}/summary")
        if res_summary.status_code == 200:
            summary_data = res_summary.json()
            print(f"[OK] POST /papers/{paper1_id}/summary succeeded with AI summary.")
            assert "research_problem" in summary_data["summary"]
        else:
            assert res_summary.status_code == 400
            assert "Gemini API key is not configured" in res_summary.text
            print("[OK] POST /papers/{id}/summary correctly caught missing GEMINI_API_KEY with 400.")

        # Test Comparison Endpoint
        compare_payload = {"paper_ids": [paper1_id, paper2_id]}
        res_comp = requests.post(f"{base_url}/papers/compare", json=compare_payload)
        if res_comp.status_code == 200:
            comp_data = res_comp.json()
            print(f"[OK] POST /papers/compare succeeded. Table rows: {len(comp_data['table'])}")
        else:
            assert res_comp.status_code == 400
            assert "Gemini API key is not configured" in res_comp.text
            print("[OK] POST /papers/compare correctly caught missing GEMINI_API_KEY with 400.")

        # Test Delete Paper Endpoint
        res_del = requests.delete(f"{base_url}/papers/{paper1_id}")
        assert res_del.status_code == 200
        print(f"[OK] DELETE /papers/{paper1_id} succeeded.")

        # Clean up second paper
        requests.delete(f"{base_url}/papers/{paper2_id}")

        print("\n=== ALL LIVE API ENDPOINT TESTS PASSED! ===")

    finally:
        server_process.terminate()
        try:
            server_process.wait(timeout=3)
        except Exception:
            server_process.kill()

        if os.path.exists(pdf_path1):
            os.remove(pdf_path1)
        if os.path.exists(pdf_path2):
            os.remove(pdf_path2)

if __name__ == "__main__":
    run_api_tests()
