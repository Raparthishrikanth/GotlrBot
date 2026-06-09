import socket
import time
import os
import urllib.parse as urlparse

def wait_for_db():
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        url = urlparse.urlparse(db_url)
        host = url.hostname
        port = url.port or 5432
    else:
        host = os.getenv('POSTGRES_HOST')
        port = os.getenv('POSTGRES_PORT')
        if port:
            port = int(port)

    if not host or not port:
        print("No database host/port configured or using SQLite. Skipping wait.")
        return

    print(f"Waiting for database at {host}:{port}...")
    start_time = time.time()
    # Wait up to 5 minutes for database creation on Render
    timeout = 300 
    
    while time.time() - start_time < timeout:
        try:
            # Resolve DNS and verify TCP port availability
            with socket.create_connection((host, port), timeout=3):
                print("Database is online and accepting connections!")
                return
        except Exception as e:
            print(f"Database not ready yet ({e}). Retrying in 5 seconds...")
            time.sleep(5)
            
    print("Timed out waiting for database to start!")
    exit(1)

if __name__ == "__main__":
    wait_for_db()
