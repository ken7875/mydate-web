needPush=0
IMAGE_NAME="my-date-client"
REGISTRY=kkkzou
DOCKERFILE="Dockerfile"
TAG="latest"       # 可自訂 tag

docker buildx build \
    -t $IMAGE_NAME:$TAG \
    -f $DOCKERFILE .
# ;then
#    docker run \
#     --env-file .env.prod \
#     --name my-date-client \
#     --network my-date \
#     -p 3000:3000 \
#     my-date-client

# else
#     echo "Docker build failed, aborting run."
# fi

# 檢查 build 是否成功
if [ $? -ne 0 ]; then
  echo "Docker build failed, aborting."
  exit 1
fi


for arg in "$@"; do
  case "$arg" in
    --needPush=*)
      needPush="${arg#*=}"
      ;;
  esac
done

if [ "$needPush" -eq 1 ]; then
  echo "Pushing ${IMAGE_NAME}:${TAG} to ${REGISTRY}..."
  docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}
  docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}

  if [ $? -ne 0 ]; then
    echo "Docker push failed."
    exit 1
  fi

  echo "Docker push completed successfully."
else
  echo "Skipping Docker push because needPush=0."
fi