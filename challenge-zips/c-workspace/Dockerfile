FROM gcc:bookworm

# Install basic dev utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    coreutils \
    gdb \
    make \
    curl \
    git \
    vim \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Setup student user
RUN useradd -m -s /bin/bash -u 1000 student \
    && echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/student 2>/dev/null || true

WORKDIR /home/student
USER student

# Keep container alive for interactive terminal and file sync in Kubernetes
CMD ["sleep", "infinity"]
