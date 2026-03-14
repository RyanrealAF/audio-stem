#!/bin/bash
find / -name "java" -type f -executable 2>/dev/null | while read -r java_path; do
  if [[ "$java_path" == *"/bin/java"* ]]; then
    java_home=$(dirname "$(dirname "$java_path")")
    if [ -f "$java_home/release" ] || [ -d "$java_home/lib" ]; then
      echo "$java_home" > java_home.txt
      exit 0
    fi
  fi
done
