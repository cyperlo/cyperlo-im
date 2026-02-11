pipeline {
    agent any
    
    environment {
        GO_VERSION = '1.22'
        NODE_VERSION = '18'
        IMAGE_TAG = "${BUILD_NUMBER}"
        DEPLOY_PATH = '/data/cyperlo-im'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Backend') {
            steps {
                dir('backend') {
                    sh '''
                        go mod download
                        CGO_ENABLED=0 GOOS=linux go build -o bin/auth ./cmd/auth
                        CGO_ENABLED=0 GOOS=linux go build -o bin/gateway ./cmd/gateway
                        CGO_ENABLED=0 GOOS=linux go build -o bin/message ./cmd/message
                    '''
                }
            }
        }
        
        stage('Build Frontend Web') {
            steps {
                dir('frontend/web') {
                    sh '''
                        yarn install
                        yarn build
                    '''
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Auth Service') {
                    steps {
                        sh 'docker build -t im-auth:${IMAGE_TAG} -t im-auth:latest -f backend/Dockerfile.auth backend/'
                    }
                }
                stage('Build Gateway Service') {
                    steps {
                        sh 'docker build -t im-gateway:${IMAGE_TAG} -t im-gateway:latest -f backend/Dockerfile.gateway backend/'
                    }
                }
                stage('Build Message Service') {
                    steps {
                        sh 'docker build -t im-message:${IMAGE_TAG} -t im-message:latest -f backend/Dockerfile.message backend/'
                    }
                }
                stage('Build Web Frontend') {
                    steps {
                        sh 'docker build -t im-web:${IMAGE_TAG} -t im-web:latest -f frontend/web/Dockerfile frontend/web/'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    cd ${DEPLOY_PATH}
                    docker-compose up -d
                    docker image prune -f
                '''
            }
        }
    }
    
    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
        always {
            cleanWs()
        }
    }
}
