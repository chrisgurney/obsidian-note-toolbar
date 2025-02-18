#!/bin/zsh

# check if a tag parameter is provided
if [[ -z "$1" ]]; then
    echo "Usage: $0 <tag>"
    exit 1
fi

TAG="$1"

# create the annotated tag
git tag -a "$TAG" -m "$TAG"

# push the tag
git push origin "$TAG"

echo "Tag $TAG created and pushed."