for d in ~/Library/*; do
  size=$(osascript -e "tell app \"Finder\" to size of (POSIX file \"$d\")")
  echo "$d Finder: $size"
done
