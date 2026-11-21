import http.server
import socketserver
import webbrowser
import os
import subprocess
import sys
import json
from pathlib import Path
import threading
import time

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/run-analysis':
            try:
                print("Running netflix_analysis.py...")
                # Run the analysis script
                result = subprocess.run([sys.executable, 'netflix_analysis.py'],
                                      capture_output=True, text=True, encoding='utf-8', check=True, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
                print("Analysis completed successfully.")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()

                response = {
                    'status': 'success',
                    'message': 'Analysis completed successfully.',
                    'output': result.stdout
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except subprocess.CalledProcessError as e:
                print(f"Error running analysis: {e.stderr}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'status': 'error',
                    'message': 'Failed to run analysis.',
                    'error': e.stderr
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                print(f"Unexpected error: {str(e)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'status': 'error',
                    'message': str(e)
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_error(404, "File not found")

def open_browser():
    time.sleep(1.5)
    url = f"http://localhost:{PORT}"
    print(f"Opening dashboard at {url}...")
    webbrowser.open(url)

def main():
    os.chdir(DIRECTORY)

    output_dir = Path("output")
    if not (output_dir / "country_content_analysis.csv").exists() or not (output_dir / "yearly_growth.csv").exists() or not Path("data/netflix_titles.csv").exists():
        print("Output files not found. Running initial analysis...")
        subprocess.run([sys.executable, 'netflix_analysis.py'], check=True)

    Handler = DashboardHandler
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server.")

        threading.Thread(target=open_browser, daemon=True).start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")

if __name__ == "__main__":
    main()
