#!/usr/bin/env sh
set -o errexit
set -o xtrace

base=$(pwd)
module=$(jq -r ".name" ${base}/package.json)
rm -rf dist
mkdir -p dist/${module}
cd dist
cp -r ${base}/src/* ${module}
cp -r ${base}/resources/languages ${module}
find ${module} -name "*.test.js" -type f -delete

version=${CI_COMMIT_BRANCH}||${CI_COMMIT_TAG}
baseUrl="https://gitlab.com/foundry-azzurite/${module}/-/jobs/artifacts/${version}/raw/dist/"
suffix="?job=build"
distributionJson="{manifest: \"${baseUrl}${module}/module.json${suffix}\", download: \"${baseUrl}${module}.zip${suffix}\"}"
jq -s "(.[0] | { name, description, author, version }) * .[1] * ${distributionJson}" ${base}/package.json ${base}/resources/module.json > ${module}/module.json

zip ${module}.zip -r ${module}
cd -
