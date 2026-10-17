FROM node:18-bullseye-slim

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

# Setup student user (remove default node UID 1000 and create student UID 1000)
RUN (userdel -r node 2>/dev/null || true) \
    && useradd -m -s /bin/bash -u 1000 student \
    && echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/student 2>/dev/null || true

WORKDIR /home/student
USER student

# Keep container alive for interactive terminal and file sync in Kubernetes
CMD ["sleep", "infinity"]
