for d in ~/Library ~/Documents ~/Downloads ~/Pictures ~/Movies ~/Music ~/Desktop; do
  size=$(osascript -e "tell app \"Finder\" to size of (POSIX file \"$d\")")
  echo "$d Finder: $size"
done
