FROM ubuntu:latest

# Install everything
RUN apt-get update
RUN apt-get install -y python3
RUN apt-get install -y python3-pip
RUN apt-get install -y git
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN apt-get install -y build-essential
RUN apt-get install -y libssl-dev
RUN apt-get install -y libffi-dev
RUN apt-get install -y python3-dev

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies
RUN pip3 install -r requirements.txt
RUN pip3 install pytest
RUN pip3 install pylint
RUN pip3 install black
RUN pip3 install jupyter

# Download model files
RUN curl -O https://example.com/model.pkl

# Set entrypoint
CMD ["python3", "app.py"]