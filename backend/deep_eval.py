import os
import subprocess

def get_du_size(path):
    try:
        res = subprocess.run(['du', '-sk', path], capture_output=True, text=True, timeout=15)
        if res.stdout:
            parts = res.stdout.strip().split()
            if parts:
                return int(parts[0]) * 1024
    except: pass
    return 0

def get_python_physical_size(path):
    total = 0
    try:
        if os.path.islink(path):
             return os.lstat(path).st_blocks * 512
        if os.path.isfile(path):
            return os.stat(path).st_blocks * 512
        with os.scandir(path) as it:
            for entry in it:
                try:
                    st = entry.stat(follow_symlinks=False)
                    if entry.is_file(follow_symlinks=False):
                        total += st.st_blocks * 512
                    elif entry.is_dir(follow_symlinks=False) and not entry.is_symlink():
                        total += get_python_physical_size(entry.path)
                except: continue
    except: pass
    return total

home = os.path.expanduser("~")
library = os.path.join(home, "Library")

print(f"{'Path':<50} | {'du (MB)':<10} | {'Python (MB)':<12}")
print("-" * 80)

if os.path.exists(library):
    for f in sorted(os.listdir(library)):
        p = os.path.join(library, f)
        if os.path.isdir(p):
            du_s = get_du_size(p)
            py_s = get_python_physical_size(p)
            if du_s > 100*1024*1024: # > 100MB
                print(f"{f:<50} | {du_s/1e6:<10.2f} | {py_s/1e6:<12.2f}")
