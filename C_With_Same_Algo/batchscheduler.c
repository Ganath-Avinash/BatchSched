#include <stdio.h>
#include <stdlib.h>

#define MAX 1000

struct Job {
    int id;
    int compute;
    int deadline;
};

void merge(struct Job arr[], int left, int mid, int right) {
    int i, j, k;
    int n1 = mid - left + 1;
    int n2 = right - mid;

    struct Job L[n1], R[n2];

    for (i = 0; i < n1; i++)
        L[i] = arr[left + i];

    for (j = 0; j < n2; j++)
        R[j] = arr[mid + 1 + j];

    i = 0;
    j = 0;
    k = left;

    // used edf + shorest compute first

    while (i < n1 && j < n2) {
        if (L[i].deadline < R[j].deadline) {
            arr[k++] = L[i++];
        }
        else if (L[i].deadline > R[j].deadline) {
            arr[k++] = R[j++];
        }
        else {
            if (L[i].compute <= R[j].compute) {
                arr[k++] = L[i++];
            } else {
                arr[k++] = R[j++];
            }
        }
    }

    while (i < n1)
        arr[k++] = L[i++];

    while (j < n2)
        arr[k++] = R[j++];
}


void mergeSort(struct Job arr[], int left, int right) {
    if (left < right) {
        int mid = (left + right) / 2;

        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);

        merge(arr, left, mid, right);
    }
}

int removeExpiredJobs(struct Job jobs[], int n, int today, struct Job valid[]) {
    int count = 0;

    for (int i = 0; i < n; i++) {
        if (jobs[i].deadline >= today) {
            valid[count++] = jobs[i];
        }
    }

    return count;
}


int selectJobs(struct Job jobs[], int n, int N, struct Job selected[]) {
    int count = 0;

    for (int i = 0; i < n && count < N; i++) {
        selected[count++] = jobs[i];
    }

    return count;
}


int calculateTotalCompute(struct Job selected[], int count) {
    int total = 0;
    for (int i = 0; i < count; i++)
        total += selected[i].compute;
    return total;
}


void printJobs(struct Job jobs[], int count, char title[]) {
    printf("\n%s\n", title);
    printf("--------------------------------\n");
    for (int i = 0; i < count; i++) {
        printf("Job %d | Compute: %d | Deadline: %d\n",
               jobs[i].id, jobs[i].compute, jobs[i].deadline);
    }
}

int main() {

    int n, today, N;

    printf("Enter number of jobs: ");
    scanf("%d", &n);

    struct Job jobs[n];
    struct Job valid[n];
    struct Job selected[n];
    struct Job remaining[n];

    for (int i = 0; i < n; i++) {
        jobs[i].id = i + 1;
        printf("Enter compute and deadline for Job %d: ", i + 1);
        scanf("%d %d", &jobs[i].compute, &jobs[i].deadline);
    }

    printf("Enter today's day: ");
    scanf("%d", &today);

    printf("Enter number of jobs to execute today (N): ");
    scanf("%d", &N);

    // Step 1: Remove expired jobs
    int validCount = removeExpiredJobs(jobs, n, today, valid);

    // Step 2: Sort valid jobs
    mergeSort(valid, 0, validCount - 1);

    // Step 3: Select first N jobs
    int selectedCount = selectJobs(valid, validCount, N, selected);

    // Step 4: Determine remaining jobs
    int remainingCount = 0;
    for (int i = selectedCount; i < validCount; i++) {
        remaining[remainingCount++] = valid[i];
    }

    // Step 5: Metrics
    int totalCompute = calculateTotalCompute(selected, selectedCount);

    // ---------------- OUTPUT ----------------

    printJobs(selected, selectedCount, "Selected Jobs for Today");

    printJobs(remaining, remainingCount, "Remaining Jobs");

    printf("\nTotal Compute Today: %d\n", totalCompute);
    printf("Expired Jobs: %d\n", n - validCount);
    printf("Backlog Size: %d\n", remainingCount);

    return 0;
}