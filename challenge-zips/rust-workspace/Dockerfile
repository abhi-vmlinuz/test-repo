FROM rust:1.77-slim-bookworm

# Install basic dev utilities & gcc for linking
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    coreutils \
    build-essential \
    curl \
    git \
    vim \
    nano \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Setup student user
RUN useradd -m -s /bin/bash -u 1000 student \
    && echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/student 2>/dev/null || true

# Give student access to cargo/rustup
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN chmod -R a+w /usr/local/cargo

WORKDIR /home/student
USER student

# Keep container alive for interactive terminal and file sync in Kubernetes
CMD ["sleep", "infinity"]
