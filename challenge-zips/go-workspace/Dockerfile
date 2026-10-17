FROM golang:1.22-bookworm

# Install basic dev utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    coreutils \
    curl \
    git \
    vim \
    nano \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Setup student user
RUN useradd -m -s /bin/bash -u 1000 student \
    && echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/student 2>/dev/null || true

# Ensure go env and bin are in student's PATH
ENV GOPATH=/home/student/go
ENV PATH=$PATH:/usr/local/go/bin:/home/student/go/bin

WORKDIR /home/student
USER student

# Keep container alive for interactive terminal and file sync in Kubernetes
CMD ["sleep", "infinity"]
