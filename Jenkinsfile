pipeline {
    agent any
    
    environment {
        IMAGE_TAG = "${BUILD_NUMBER}"
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
                        sh 'docker build -t im-auth:latest -f backend/Dockerfile.auth backend/'
                    }
                }
                stage('Build Gateway Service') {
                    steps {
                        sh 'docker build -t im-gateway:latest -f backend/Dockerfile.gateway backend/'
                    }
                }
                stage('Build Message Service') {
                    steps {
                        sh 'docker build -t im-message:latest -f backend/Dockerfile.message backend/'
                    }
                }
                stage('Build Web Frontend') {
                    steps {
                        sh 'docker build -t im-web:latest -f frontend/web/Dockerfile frontend/web/'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                withCredentials([
                    string(credentialsId: 'DB_HOST', variable: 'DB_HOST'),
                    string(credentialsId: 'DB_USER', variable: 'DB_USER'),
                    string(credentialsId: 'DB_PASSWORD', variable: 'DB_PASSWORD'),
                    string(credentialsId: 'DB_NAME', variable: 'DB_NAME'),
                    string(credentialsId: 'JWT_SECRET', variable: 'JWT_SECRET')
                ]) {
                    sh '''
                        cp .env.example .env
                        docker-compose up -d
                        docker image prune -af --filter "until=24h"
                    '''
                }
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
    }
}
