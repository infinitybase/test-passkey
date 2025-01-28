import {ReactNode, useEffect, useRef, useState} from "react";
import {Box, Button, Center, chakra, createIcon, Flex, HStack, ProgressCircleRoot, VStack, Text} from "@chakra-ui/react";
import {ProgressCircleRing} from "@/components/ui/progress-circle.tsx";
import {bytesToHex, createAccount, JSONRpcMessageRequest, signChallange} from "bakosafe";
import {JSONRPCServer} from "json-rpc-2.0";
import {useMutation} from "@tanstack/react-query";
import {EmptyState} from "@/components/ui/empty-state.tsx";
import {Tag} from "@/components/ui/tag.tsx";

const PrimaryButton = chakra(Button, {
    base: {
        w: "full",
        borderRadius: "xl",
        colorScheme: "whiteAlpha",
    }
})

const BakoIcon = createIcon({
    path: (
        <>
            <path d="M0.601562 301.809L349.398 475.379L175.035 201.194L0.601562 301.809Z" fillOpacity="0.5"
                  fill="currentColor"/>
            <path
                d="M304.147 248.109L174.965 173.575V0L0.601562 100.61V301.815L174.965 201.206V374.78L0.601562 475.39L174.965 576L349.329 475.39V326.322C349.329 294.054 332.101 264.243 304.147 248.109Z"
                fill="currentColor"/>
        </>
    ),
    viewBox: "0 0 350 576"
})

const PageWrapper = ({children}: { children: ReactNode }) => {
    return (
        <Flex
            align="center"
            justify="center"
            minH="100vh"
            bg="black"
            w="100vw"
        >
            <Center
                bgImage="linear-gradient({colors.gray.900}, {colors.gray.950})"
                borderRadius={{
                    base: 'none',
                    sm: '3xl'
                }}
                borderWidth={2}
                borderBlockStyle="solid"
                borderColor="rgb(31 31 31 / 1)"
                maxW={{
                    base: '100%',
                    sm: 340
                }}
                w="full"
                p={4}
                px={5}
                height={{
                    base: '100vh',
                    sm: 600
                }}
                maxH={{
                    base: '100vh',
                    sm: 600
                }}
                textAlign="center"
                flexDirection="column"
            >
                {children}
                {/* @ts-expect-error target not included in hstack */}
                <HStack as="a" target="blank" href="https://bako.global/" mt={4} gap={1}>
                    <Text color="gray" fontSize="xs" as="span">
                        Powered by
                    </Text>
                    <BakoIcon size="sm" color="gray.600"/>
                </HStack>
            </Center>
        </Flex>
    )
}

enum Page {
    CreateAccount = 'create-account',
    SignMessage = 'sign-message',
}

type PageData = {
    type: Page.CreateAccount,
    data: {
        username: string;
    }
} | {
    type: Page.SignMessage,
    data: {
        challenge: string;
        passkeyId: string;
        publicKey: string;
    }
}

function App() {
    const [isReady, setIsReady] = useState(false);
    const [page, setPage] = useState<PageData>();

    const eventRef = useRef<MessageEvent | null>(null);

    useEffect(() => {
        if (isReady) return;

        const getUrlParams = (): Record<string, string> => {
            const params = new URLSearchParams(window.location.search);
            const result: Record<string, string> = {};

            params.forEach((value, key) => {
                result[key] = value;
            });

            return result;
        };

        const server = new JSONRPCServer();

        const messageListener = async (event: MessageEvent) => {
            const isValid = event.origin === getUrlParams().origin;
            if (!isValid) return;

            if (event.data.jsonrpc) {
                await server.receive(event.data);
                eventRef.current = event;
            }
        };

        window.addEventListener("message", messageListener);

        server.addMethod(JSONRpcMessageRequest.CREATE_ACCOUNT, async ({username}) => {
            setPage({
                type: Page.CreateAccount,
                data: {
                    username,
                }
            })
        });

        server.addMethod(
            JSONRpcMessageRequest.SIGN_MESSAGE,
            async ({challenge, passkeyId, publicKey}) => {
                setPage({
                    type: Page.SignMessage,
                    data: {
                        challenge,
                        passkeyId,
                        publicKey,
                    }
                });
            }
        );

        setIsReady(true);
        return () => {
            eventRef.current = null;
            window.removeEventListener("message", messageListener);
        };
    }, []);

    const sendRPCResponse = (result: any) => {
        if (!eventRef.current) return;
        eventRef.current.source?.postMessage({
            jsonrpc: "2.0",
            id: eventRef.current.data.id,
            result,
        }, {
            targetOrigin: eventRef.current.origin
        });
    };

    const accountMutation = useMutation({
        mutationFn: async () => {
            if (!eventRef.current) return;

            if (page?.type === Page.CreateAccount) {
                const {username} = page.data;
                const account = await createAccount(
                    username,
                    bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
                );

                sendRPCResponse({
                    account: {
                        address: account.address,
                        publicKey: account.publicKeyHex,
                        origin: window.location.origin,
                    },
                    id: account.credential?.id,
                });
            }
        }
    });

    const signMessageMutation = useMutation({
        mutationFn: async () => {
            if (!eventRef.current) return;

            if (page?.type === Page.SignMessage) {
                const {challenge, passkeyId, publicKey} = page.data;
                const data = await signChallange(passkeyId, challenge, publicKey);
                sendRPCResponse(data);
            }
        }
    });

    return (
        <PageWrapper>
            {(!isReady || !page) && (
                <VStack justifyContent="center" h="full" mt={8} flex={1}>
                    <ProgressCircleRoot value={null} size="sm">
                        <ProgressCircleRing cap="round"/>
                    </ProgressCircleRoot>
                </VStack>
            )}
            {page?.type === Page.CreateAccount && (
                <VStack w="full" flex={1}>
                    <Center w="full" maxW={300} flex={1}>
                        <EmptyState
                            title="Passkey Account"
                            description="Click in 'Create Account' to create a new account with username:"
                            p={0}
                        >
                            <Tag size="lg" py={1} px={3} variant="subtle">
                                {page.data.username}
                            </Tag>
                        </EmptyState>
                    </Center>
                    <VStack w="full">
                        <PrimaryButton
                            w="full"
                            size="xl"
                            isLoading={accountMutation.isPending}
                            onClick={() => accountMutation.mutate()}
                        >
                            Create Account
                        </PrimaryButton>
                        <PrimaryButton
                            w="full"
                            size="xl"
                            variant="outline"
                            onClick={window.close}
                        >
                            Cancel
                        </PrimaryButton>
                    </VStack>
                </VStack>
            )}
            {page?.type === Page.SignMessage && (
                <VStack w="full" flex={2}>
                    <Center w="full" maxW={300} flex={1}>
                        <EmptyState
                            title="Sign Message"
                            description="Click in 'Sign Message' to sign a challenge with your passkey:"
                            p={0}
                        >
                            <Box borderWidth={1} borderRadius="lg" bgColor="gray.900" wordBreak="break-all"
                                 lineClamp="none" py={1} px={3}>
                                {page.data.challenge}
                            </Box>
                        </EmptyState>
                    </Center>
                    <VStack w="full">
                        <PrimaryButton
                            w="full"
                            size="xl"
                            isLoading={signMessageMutation.isPending}
                            onClick={() => signMessageMutation.mutate()}
                        >
                            Sign Message
                        </PrimaryButton>
                        <PrimaryButton
                            w="full"
                            size="xl"
                            variant="outline"
                            onClick={window.close}
                        >
                            Cancel
                        </PrimaryButton>
                    </VStack>
                </VStack>
            )}
        </PageWrapper>
    );
}

export default App
