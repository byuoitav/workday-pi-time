FROM alpine:3.18


ARG NAME

COPY ${NAME} /workday-pi-time
COPY dist/analog /analog

ENTRYPOINT ["/workday-pi-time"]
