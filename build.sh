docker buildx build \
    -t my-date-client \
    -f Dockerfile .
;then
   docker run \
    --env-file .env.prod \
    --name my-date-client \
    --network my-date \
    -p 3000:3000 \
    my-date-client

else
    echo "Docker build failed, aborting run."
fi