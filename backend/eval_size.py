import os
import subprocess

def get_mac_size(path):
    try:
        res = subprocess.run(['du', '-sk', path], capture_output=True, text=True, timeout=10)
        if res.stdout:
            parts = res.stdout.strip().split()
            if parts:
                return int(parts[0]) * 1024
    except Exception:
        pass
    return 0

def get_fast_stats(path):
    total = 0
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    st = entry.stat(follow_symlinks=False)
                    if entry.is_file(follow_symlinks=False):
                        # Use physical blocks to match macOS Finder 'Space on Disk'
                        total += st.st_blocks * 512
                    elif entry.is_dir(follow_symlinks=False) and not entry.is_symlink():
                        total += get_fast_stats(entry.path)
                except: continue
    except: pass
    return total

home = os.path.expanduser("~")
print(f"{'Folder':<30} | {'du Size (MB)':<15} | {'Physical Size (MB)':<15} | {'Diff (MB)':<15}")
print("-" * 85)

total_mac = 0
total_fast = 0

try:
    for f in os.listdir(home):
        p = os.path.join(home, f)
        if os.path.isdir(p):
            mac_s = get_mac_size(p)
            fast_s = get_fast_stats(p)
            total_mac += mac_s
            total_fast += fast_s
            
            mac_mb = mac_s / 1024 / 1024
            fast_mb = fast_s / 1024 / 1024
            diff = mac_mb - fast_mb
            
            if abs(diff) > 1:  # Only print if diff > 1MB
                print(f"{f:<30} | {mac_mb:<15.2f} | {fast_mb:<15.2f} | {diff:<15.2f}")
                
    print("-" * 85)
    print(f"{'TOTAL':<30} | {total_mac/1024/1024:<15.2f} | {total_fast/1024/1024:<15.2f} | {(total_mac-total_fast)/1024/1024:<15.2f}")
except Exception as e:
    print("Error:", e)
