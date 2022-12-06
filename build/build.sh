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

build_ref=${CI_COMMIT_REF_NAME}
baseUrl="https://gitlab.com/foundry-azzurite/${module}/-/jobs/artifacts/${build_ref}/raw/dist/"
suffix="?job=build"

distributionJson() {
  manifest="${baseUrl}${module}/module.json${suffix}"
  download="${baseUrl}${module}.zip${suffix}"
  echo "{\
          manifest: \"$manifest\",\
          download: \"$download\"\
        }"
}

jq -s "( \
         .[0] | \
         { name, description, author, version } | \
         .id = .name | \
         del(.name) |\
         .authors = [ .author ] |\
         del(.author) \
       ) \
       * .[1] \
       * $(distributionJson)" \
      ${base}/package.json \
      ${base}/resources/module.json \
      > ${module}/module.json

zip ${module}.zip -r ${module}
cd -
