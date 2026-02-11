pipeline {
    agent any
    
    environment {
        IMAGE_TAG = "${BUILD_NUMBER}"
        DEPLOY_PATH = '/data/cyperlo-im'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
